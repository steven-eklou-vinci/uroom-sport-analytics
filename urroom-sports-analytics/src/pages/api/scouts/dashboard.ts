import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: 'Non authentifié' });
  }

  if (session.user.role !== 'SCOUT' && session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Accès interdit' });
  }

  try {
    const userId = session.user.id;

    // Count reports created by this scout
    const reportsCreated = await prisma.report.count({
      where: {
        authorId: userId
      }
    });

    // Count players followed by this scout
    const playersFollowed = await prisma.playerFollow.count({
      where: {
        scoutId: userId
      }
    });

    // Get followed players with details
    const followedPlayers = await prisma.playerFollow.findMany({
      where: {
        scoutId: userId
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            positions: true,
            nationality: true,
            photoUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Get recent activity (reports and follows)
    const recentReports = await prisma.report.findMany({
      where: {
        authorId: userId
      },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    const recentFollows = await prisma.playerFollow.findMany({
      where: {
        scoutId: userId
      },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Combine and sort recent activity
    const recentActivity = [
      ...recentReports.map((report) => ({
        id: report.id,
        type: 'report' as const,
        playerName: `${report.player.firstName} ${report.player.lastName}`,
        createdAt: report.createdAt.toISOString()
      })),
      ...recentFollows.map((follow) => ({
        id: follow.id,
        type: 'follow' as const,
        playerName: `${follow.player.firstName} ${follow.player.lastName}`,
        createdAt: follow.createdAt.toISOString()
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    // Format followed players data
    const formattedFollowedPlayers = followedPlayers.map((follow) => ({
      id: follow.player.id,
      firstName: follow.player.firstName,
      lastName: follow.player.lastName,
      positions: follow.player.positions,
      nationality: follow.player.nationality,
      photoUrl: follow.player.photoUrl
    }));

    return res.status(200).json({
      reportsCreated,
      playersFollowed,
      recentActivity,
      followedPlayers: formattedFollowedPlayers
    });
  } catch (error) {
    console.error('Error fetching scout dashboard:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}
