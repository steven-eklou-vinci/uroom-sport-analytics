import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Get user with player profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        players: {
          include: {
            reports: {
              include: {
                author: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!user?.players || user.players.length === 0) {
      return res.status(200).json([]);
    }

    const player = user.players[0];
    const reports = player.reports.map(report => ({
      id: report.id,
      authorName: report.author?.name || 'Scout anonyme',
      summary: report.summary,
      createdAt: report.createdAt,
    }));

    return res.status(200).json(reports);
  } catch (error) {
    console.error('Error in reports API:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    await prisma.$disconnect();
  }
}
