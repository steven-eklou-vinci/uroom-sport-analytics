import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/prisma';

export const config = {
  api: { responseLimit: false },
};

const contentTypes: Record<string, string> = {
  '.avi': 'video/x-msvideo',
  '.m4v': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'HEAD']);
    return res.status(405).end();
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).end();

  const match = await prisma.matchAnalysis.findFirst({
    where: {
      id: String(req.query.id),
      ...(session.user.role === 'ADMIN' ? {} : { createdById: session.user.id }),
    },
    select: { videoUrl: true, analysisJobId: true, hasAnnotatedVideo: true },
  });
  if (!match) return res.status(404).end();

  if (req.query.annotated === '1') {
    if (!match.analysisJobId || !match.hasAnnotatedVideo) return res.status(404).end();
    const requestHeaders: Record<string, string> = {};
    const serviceToken = process.env.IA_SERVICE_TOKEN;
    if (serviceToken) requestHeaders['X-Uroom-Service-Token'] = serviceToken;
    if (req.headers.range) requestHeaders.Range = req.headers.range;

    try {
      const annotatedResponse = await fetch(
        `${(process.env.IA_MODEL_URL || 'http://localhost:8000').replace(/\/$/, '')}/match/jobs/${match.analysisJobId}/annotated`,
        { method: req.method, headers: requestHeaders },
      );
      if (!annotatedResponse.ok) return res.status(annotatedResponse.status).end();

      for (const header of ['accept-ranges', 'cache-control', 'content-length', 'content-range', 'content-type']) {
        const value = annotatedResponse.headers.get(header);
        if (value) res.setHeader(header, value);
      }
      res.status(annotatedResponse.status);
      if (req.method === 'HEAD') return res.end();
      if (!annotatedResponse.body) return res.status(502).end();
      Readable.fromWeb(annotatedResponse.body as ReadableStream<Uint8Array>).pipe(res);
      return;
    } catch (error) {
      console.error('Unable to stream annotated match video:', error);
      return res.status(502).end();
    }
  }

  const filename = path.basename(match.videoUrl);
  if (filename !== match.videoUrl) return res.status(404).end();
  const videoPath = path.join(process.cwd(), 'data', 'match_uploads', filename);
  let fileSize: number;
  try {
    fileSize = fs.statSync(videoPath).size;
  } catch {
    return res.status(404).end();
  }

  const extension = path.extname(filename).toLowerCase();
  res.setHeader('Content-Type', contentTypes[extension] || 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, no-store');

  const range = req.headers.range;
  if (range) {
    const matchRange = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!matchRange) return res.status(416).end();
    const start = matchRange[1] ? Number(matchRange[1]) : 0;
    const end = matchRange[2] ? Math.min(Number(matchRange[2]), fileSize - 1) : fileSize - 1;
    if (start >= fileSize || start > end) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).end();
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', end - start + 1);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(videoPath, { start, end }).pipe(res);
    return;
  }

  res.setHeader('Content-Length', fileSize);
  if (req.method === 'HEAD') return res.status(200).end();
  fs.createReadStream(videoPath).pipe(res);
}