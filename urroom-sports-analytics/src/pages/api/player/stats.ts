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
            reports: true,
            trialRequests: true,
            followers: true,
          },
        },
      },
    });

    if (!user?.players || user.players.length === 0) {
      return res.status(200).json({
        uroomRank: null,
        uroomScore: 0,
        totalPlayers: 0,
        profileViews: 0,
        reportsReceived: 0,
        trialRequests: 0,
        followersCount: 0,
      });
    }

    const player = user.players[0];

    // Get total players count
    const totalPlayers = await prisma.playerProfile.count();

    return res.status(200).json({
      uroomRank: player.uroomRank || null,
      uroomScore: player.uroomScore || 0,
      totalPlayers,
      profileViews: player.profileViews || 0,
      reportsReceived: player.reports?.length || 0,
      trialRequests: player.trialRequests?.length || 0,
      followersCount: player.followers?.length || 0,
      playerName: `${player.firstName} ${player.lastName}`,
      photoUrl: player.photoUrl || null,
    });
  } catch (error) {
    console.error('Error in stats API:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    await prisma.$disconnect();
  }
}
