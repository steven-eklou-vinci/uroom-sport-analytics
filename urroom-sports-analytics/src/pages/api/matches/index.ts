import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import formidable, { type File } from 'formidable';
import fs, { createReadStream } from 'node:fs';
import path from 'node:path';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export const config = {
  api: { bodyParser: false },
};

const allowedVideoExtensions = new Set(['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm']);
const maxVideoSize = Number(process.env.UROOM_MATCH_MAX_FILE_SIZE || 10 * 1024 ** 3);

interface TrackingJob {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  annotatedVideoAvailable?: boolean;
  trackFramesAvailable?: boolean;
  processedFrames?: number;
  fps?: number;
  tracks?: Array<{
    trackId: number;
    class: string;
    detections: number;
    firstFrame: number;
    lastFrame: number;
    visibleSeconds: number;
  }>;
  error?: string;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function readJsonBody(req: NextApiRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};

  const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Expected a JSON object');
  }
  return body as Record<string, unknown>;
}

function getAnalysisServiceUrl(): string {
  return (process.env.IA_MODEL_URL || 'http://localhost:8000').replace(/\/$/, '');
}

function getServiceHeaders(): Record<string, string> {
  const token = process.env.IA_SERVICE_TOKEN;
  return token ? { 'X-Uroom-Service-Token': token } : {};
}

async function syncAnalysis(matchId: string, jobId: string, currentStatus: string) {
  if (!['QUEUED', 'PROCESSING'].includes(currentStatus)) return;

  try {
    const response = await fetch(`${getAnalysisServiceUrl()}/match/jobs/${jobId}`, {
      headers: getServiceHeaders(),
    });
    if (!response.ok) return;

    const job = await response.json() as TrackingJob;
    if (job.status === 'COMPLETED') {
      await prisma.$transaction(async (transaction) => {
        await transaction.matchPlayerTracking.deleteMany({ where: { matchId } });
        for (const track of job.tracks || []) {
          const statisticRows = [
            { key: 'detections', value: track.detections, unit: 'frames' },
            { key: 'first_frame', value: track.firstFrame, unit: 'frame' },
            { key: 'last_frame', value: track.lastFrame, unit: 'frame' },
            { key: 'visible_seconds', value: track.visibleSeconds, unit: 's' },
          ];
          await transaction.matchPlayerTracking.create({
            data: {
              matchId,
              trackId: track.trackId,
              objectClass: track.class,
              associationConfirmed: false,
              statistics: { create: statisticRows },
            },
          });
        }
        await transaction.matchAnalysis.update({
          where: { id: matchId },
          data: {
            status: 'COMPLETED',
            processedFrames: job.processedFrames,
            fps: job.fps,
            hasAnnotatedVideo: job.annotatedVideoAvailable === true,
            hasTrackFrames: job.trackFramesAvailable === true,
            error: null,
          },
        });
      });
    } else if (job.status === 'FAILED') {
      await prisma.matchAnalysis.update({
        where: { id: matchId },
        data: { status: 'FAILED', error: job.error || 'Échec de l’analyse vidéo' },
      });
    } else if (job.status === 'CANCELLED') {
      await prisma.matchAnalysis.update({
        where: { id: matchId },
        data: { status: 'CANCELLED', error: null },
      });
    } else if (job.status === 'PROCESSING' && currentStatus !== 'PROCESSING') {
      await prisma.matchAnalysis.update({ where: { id: matchId }, data: { status: 'PROCESSING' } });
    }
  } catch (error) {
    console.error('Unable to synchronize match analysis:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Non authentifié' });
  if (!['ADMIN', 'SCOUT'].includes(session.user.role)) {
    return res.status(403).json({ error: 'Accès réservé aux scouts et administrateurs' });
  }

  if (req.method === 'GET') {
    const where = session.user.role === 'ADMIN' ? {} : { createdById: session.user.id };
    const existing = await prisma.matchAnalysis.findMany({
      where,
      select: { id: true, analysisJobId: true, status: true },
    });
    await Promise.all(existing.map((match) =>
      match.analysisJobId
        ? syncAnalysis(match.id, match.analysisJobId, match.status)
        : Promise.resolve()
    ));

    const [matches, players] = await Promise.all([
      prisma.matchAnalysis.findMany({
        where,
        include: {
          players: {
            include: {
              player: { select: { id: true, firstName: true, lastName: true } },
              statistics: true,
            },
            orderBy: { trackId: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.playerProfile.findMany({
        select: { id: true, firstName: true, lastName: true, positions: true },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
    ]);
    return res.status(200).json({
      matches: matches.map((match) => ({
        ...match,
        videoUrl: `/api/matches/video/${match.id}`,
        annotatedVideoUrl: match.hasAnnotatedVideo
          ? `/api/matches/video/${match.id}?annotated=1`
          : null,
      })),
      players,
    });
  }

  if (req.method === 'POST') {
    const uploadDir = path.join(process.cwd(), 'data', 'match_uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: maxVideoSize,
      multiples: false,
    });

    try {
      const [fields, files] = await form.parse(req);
      const videoFile = (files.video?.[0] || files.video) as File | undefined;
      const title = firstValue(fields.title)?.trim();
      const opponent = firstValue(fields.opponent)?.trim();
      const matchDateValue = firstValue(fields.matchDate);
      if (!videoFile || !title) return res.status(400).json({ error: 'Titre et vidéo requis' });

      const extension = path.extname(videoFile.originalFilename || '').toLowerCase();
      if (!allowedVideoExtensions.has(extension) || !videoFile.mimetype?.startsWith('video/')) {
        fs.unlinkSync(videoFile.filepath);
        return res.status(400).json({ error: 'Format vidéo non pris en charge' });
      }

      const filename = `match-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
      const videoPath = path.join(uploadDir, filename);
      fs.renameSync(videoFile.filepath, videoPath);
      const matchDate = matchDateValue ? new Date(matchDateValue) : undefined;
      if (matchDate && Number.isNaN(matchDate.getTime())) {
        fs.unlinkSync(videoPath);
        return res.status(400).json({ error: 'Date de match invalide' });
      }

      const match = await prisma.matchAnalysis.create({
        data: {
          title,
          opponent: opponent || null,
          matchDate,
          videoUrl: filename,
          createdById: session.user.id,
          status: 'UPLOADED',
        },
      });

      try {
        const serviceResponse = await fetch(`${getAnalysisServiceUrl()}/match/jobs`, {
          method: 'POST',
          headers: {
            ...getServiceHeaders(),
            'Content-Type': 'application/octet-stream',
            'X-Video-Filename': filename,
          },
          body: createReadStream(videoPath) as unknown as BodyInit,
          duplex: 'half',
        } as RequestInit & { duplex: 'half' });
        if (!serviceResponse.ok) {
          throw new Error(`Tracking service returned ${serviceResponse.status}`);
        }
        const job = await serviceResponse.json() as { id: string; status: 'QUEUED' | 'PROCESSING' };
        const updatedMatch = await prisma.matchAnalysis.update({
          where: { id: match.id },
          data: { analysisJobId: job.id, status: job.status },
        });
        return res.status(201).json({
          ...updatedMatch,
          videoUrl: `/api/matches/video/${updatedMatch.id}`,
        });
      } catch (error) {
        const message = error instanceof TypeError && error.message === 'fetch failed'
          ? `Service de tracking inaccessible (${getAnalysisServiceUrl()}). Vérifiez que FastAPI est démarré.`
          : error instanceof Error ? error.message : 'Service de tracking indisponible';
        const failedMatch = await prisma.matchAnalysis.update({
          where: { id: match.id },
          data: { status: 'FAILED', error: message },
        });
        return res.status(201).json({
          ...failedMatch,
          videoUrl: `/api/matches/video/${failedMatch.id}`,
        });
      }
    } catch (error) {
      const uploadError = error as { httpCode?: number; code?: number };
      if (uploadError?.httpCode === 413 || uploadError?.code === 1009) {
        const maxSizeGb = Math.floor(maxVideoSize / 1024 ** 3);
        return res.status(413).json({ error: `Vidéo trop volumineuse (maximum ${maxSizeGb} Go)` });
      }
      console.error('Unable to create match analysis:', error);
      return res.status(500).json({ error: 'Impossible de créer l’analyse du match' });
    }
  }

  if (req.method === 'PATCH') {
    let patchBody: Record<string, unknown>;
    try {
      patchBody = await readJsonBody(req);
    } catch {
      return res.status(400).json({ error: 'Corps JSON invalide' });
    }

    const { action, matchId, trackId, playerId } = patchBody as {
      action?: string;
      matchId?: string;
      trackId?: number;
      playerId?: string | null;
    };

    if (action === 'confirm-all-associations') {
      if (!matchId) return res.status(400).json({ error: 'Identifiant du match requis' });
      const match = await prisma.matchAnalysis.findFirst({
        where: {
          id: matchId,
          ...(session.user.role === 'ADMIN' ? {} : { createdById: session.user.id }),
        },
        select: { id: true },
      });
      if (!match) return res.status(404).json({ error: 'Match introuvable' });
      const result = await prisma.matchPlayerTracking.updateMany({
        where: { matchId, playerId: { not: null }, associationConfirmed: false },
        data: { associationConfirmed: true },
      });
      return res.status(200).json({ confirmedCount: result.count });
    }

    if (action === 'confirm-association' || action === 'unconfirm-association') {
      if (!matchId || typeof trackId !== 'number' || !Number.isInteger(trackId)) {
        return res.status(400).json({ error: 'Match et identifiant de track requis' });
      }
      const match = await prisma.matchAnalysis.findFirst({
        where: {
          id: matchId,
          ...(session.user.role === 'ADMIN' ? {} : { createdById: session.user.id }),
        },
        select: { id: true },
      });
      if (!match) return res.status(404).json({ error: 'Match introuvable' });
      const tracking = await prisma.matchPlayerTracking.findFirst({ where: { matchId, trackId } });
      if (!tracking) return res.status(404).json({ error: 'Track introuvable' });
      if (action === 'confirm-association' && !tracking.playerId) {
        return res.status(409).json({ error: 'Associez d’abord un profil joueur à ce track' });
      }
      const updatedTracking = await prisma.matchPlayerTracking.update({
        where: { id: tracking.id },
        data: { associationConfirmed: action === 'confirm-association' },
      });
      return res.status(200).json(updatedTracking);
    }

    if (action === 'cancel') {
      if (!matchId) return res.status(400).json({ error: 'Identifiant du match requis' });
      const match = await prisma.matchAnalysis.findFirst({
        where: {
          id: matchId,
          ...(session.user.role === 'ADMIN' ? {} : { createdById: session.user.id }),
        },
      });
      if (!match) return res.status(404).json({ error: 'Match introuvable' });
      if (!match.analysisJobId || !['QUEUED', 'PROCESSING'].includes(match.status)) {
        return res.status(409).json({ error: 'Ce match n’a pas d’analyse active à annuler' });
      }

      try {
        const cancelResponse = await fetch(
          `${getAnalysisServiceUrl()}/match/jobs/${match.analysisJobId}/cancel`,
          { method: 'POST', headers: getServiceHeaders() },
        );
        if (!cancelResponse.ok) {
          return res.status(502).json({ error: 'Le service de tracking n’a pas confirmé l’annulation' });
        }
        const job = await cancelResponse.json() as TrackingJob;
        if (job.status === 'COMPLETED') {
          await syncAnalysis(match.id, match.analysisJobId, match.status);
          return res.status(409).json({ error: 'L’analyse vient de se terminer et ne peut plus être annulée' });
        }
        if (job.status === 'FAILED') {
          await prisma.matchAnalysis.update({
            where: { id: match.id },
            data: { status: 'FAILED', error: job.error || 'Échec de l’analyse vidéo' },
          });
          return res.status(409).json({ error: 'L’analyse a déjà échoué' });
        }
        const cancelledMatch = await prisma.matchAnalysis.update({
          where: { id: match.id },
          data: { status: 'CANCELLED', error: null },
        });
        return res.status(200).json(cancelledMatch);
      } catch (error) {
        console.error('Unable to cancel match analysis:', error);
        return res.status(503).json({ error: 'Service de tracking inaccessible; annulation non confirmée' });
      }
    }

    if (!matchId || typeof trackId !== 'number' || !Number.isInteger(trackId)) {
      return res.status(400).json({ error: 'Match et identifiant de track requis' });
    }

    const match = await prisma.matchAnalysis.findFirst({
      where: {
        id: matchId,
        ...(session.user.role === 'ADMIN' ? {} : { createdById: session.user.id }),
      },
    });
    if (!match) return res.status(404).json({ error: 'Match introuvable' });

    const tracking = await prisma.matchPlayerTracking.findFirst({
      where: { matchId, trackId },
    });
    if (!tracking) return res.status(404).json({ error: 'Track introuvable' });
    if (playerId && !['player', 'person'].includes(tracking.objectClass)) {
      return res.status(400).json({ error: 'Seuls les tracks de joueurs peuvent être associés à un profil' });
    }
    if (playerId && !(await prisma.playerProfile.findUnique({ where: { id: playerId }, select: { id: true } }))) {
      return res.status(404).json({ error: 'Profil joueur introuvable' });
    }

    const updatedTracking = await prisma.matchPlayerTracking.update({
      where: { id: tracking.id },
      data: {
        playerId: playerId || null,
        associationConfirmed: false,
      },
    });
    return res.status(200).json(updatedTracking);
  }

  if (req.method === 'DELETE') {
    const matchId = firstValue(req.query.id);
    if (!matchId) return res.status(400).json({ error: 'Identifiant du match requis' });

    const match = await prisma.matchAnalysis.findFirst({
      where: {
        id: matchId,
        ...(session.user.role === 'ADMIN' ? {} : { createdById: session.user.id }),
      },
      select: { id: true, videoUrl: true, status: true },
    });
    if (!match) return res.status(404).json({ error: 'Match introuvable' });
    if (match.status === 'QUEUED' || match.status === 'PROCESSING') {
      return res.status(409).json({ error: 'Attendez la fin de l’analyse avant de supprimer ce match' });
    }

    const filename = path.basename(match.videoUrl);
    if (filename !== match.videoUrl) {
      return res.status(500).json({ error: 'Chemin vidéo invalide' });
    }

    const videoPath = path.join(process.cwd(), 'data', 'match_uploads', filename);
    await fs.promises.rm(videoPath, { force: true });
    await prisma.matchAnalysis.delete({ where: { id: match.id } });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}