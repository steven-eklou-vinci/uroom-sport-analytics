import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import { syncAnalysis } from '../../../lib/matchAnalysis';

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
  if (!matchId) return res.status(400).json({ error: 'Identifiant du match requis' });

  const where = {
    id: matchId,
    ...(session.user.role === 'ADMIN' ? {} : { createdById: session.user.id }),
  };

  const existing = await prisma.matchAnalysis.findFirst({
    where,
    select: { id: true, analysisJobId: true, status: true },
  });
  if (!existing) return res.status(404).json({ error: 'Match introuvable' });
  if (existing.analysisJobId) {
    await syncAnalysis(existing.id, existing.analysisJobId, existing.status);
  }

  const [match, players] = await Promise.all([
    prisma.matchAnalysis.findUnique({
      where: { id: matchId },
      include: {
        players: {
          include: {
            player: { select: { id: true, firstName: true, lastName: true, positions: true } },
            statistics: true,
          },
          orderBy: { trackId: 'asc' },
        },
      },
    }),
    prisma.playerProfile.findMany({
      select: { id: true, firstName: true, lastName: true, positions: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ]);
  if (!match) return res.status(404).json({ error: 'Match introuvable' });

  return res.status(200).json({
    match: {
      ...match,
      videoUrl: `/api/matches/video/${match.id}`,
      annotatedVideoUrl: match.hasAnnotatedVideo
        ? `/api/matches/video/${match.id}?annotated=1`
        : null,
    },
    players,
  });
}
