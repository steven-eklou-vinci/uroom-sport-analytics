import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

function parseFrame(value: string | string[] | undefined): number | null {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Non authentifié' });
  if (!['ADMIN', 'SCOUT'].includes(session.user.role)) {
    return res.status(403).json({ error: 'Accès réservé aux scouts et administrateurs' });
  }

  const matchId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const startFrame = parseFrame(req.query.startFrame);
  const endFrame = parseFrame(req.query.endFrame);
  if (!matchId || startFrame === null || endFrame === null || endFrame < startFrame || endFrame - startFrame > 600) {
    return res.status(400).json({ error: 'Fenêtre de frames invalide' });
  }

  const match = await prisma.matchAnalysis.findFirst({
    where: {
      id: matchId,
      ...(session.user.role === 'ADMIN' ? {} : { createdById: session.user.id }),
    },
    select: { analysisJobId: true, hasTrackFrames: true },
  });
  if (!match?.analysisJobId || !match.hasTrackFrames) {
    return res.status(404).json({ error: 'Données vidéo indisponibles pour ce match' });
  }

  const confirmedTracks = await prisma.matchPlayerTracking.findMany({
    where: { matchId, associationConfirmed: true, playerId: { not: null } },
    select: {
      trackId: true,
      player: { select: { firstName: true, lastName: true } },
    },
  });
  if (confirmedTracks.length === 0) {
    return res.status(200).json({ tracks: [], frames: [] });
  }

  const query = new URLSearchParams({
    start_frame: String(startFrame),
    end_frame: String(endFrame),
    track_ids: confirmedTracks.map((track) => track.trackId).join(','),
  });
  try {
    const trackingResponse = await fetch(
      `${(process.env.IA_MODEL_URL || 'http://localhost:8000').replace(/\/$/, '')}/match/jobs/${match.analysisJobId}/frames?${query}`,
      {
        headers: process.env.IA_SERVICE_TOKEN
          ? { 'X-Uroom-Service-Token': process.env.IA_SERVICE_TOKEN }
          : undefined,
      },
    );
    if (!trackingResponse.ok) {
      return res.status(trackingResponse.status).json({ error: 'Impossible de charger les marqueurs associés' });
    }
    const frameData = await trackingResponse.json() as { frames: Array<{ frame: number; detections: number[][] }> };
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      tracks: confirmedTracks.map((track) => ({
        trackId: track.trackId,
        playerName: track.player ? `${track.player.firstName} ${track.player.lastName}` : 'Joueur',
      })),
      frames: frameData.frames,
    });
  } catch (error) {
    console.error('Unable to fetch confirmed match track frames:', error);
    return res.status(503).json({ error: 'Service de tracking inaccessible' });
  }
}