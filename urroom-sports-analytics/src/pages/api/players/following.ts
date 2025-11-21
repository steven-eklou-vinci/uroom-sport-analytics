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

    // Get the user's club to check for other scouts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { clubId: true }
    });

    // Get all followed players
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
            photoUrl: true,
            birthDate: true,
            foot: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // For each player, check if other scouts from the same club are following them
    const followedPlayersWithInfo = await Promise.all(
      followedPlayers.map(async (follow) => {
        let followedByOtherScouts = false;
        let otherScoutsCount = 0;

        if (user?.clubId) {
          // Get other scouts from the same club following this player
          const otherScouts = await prisma.playerFollow.findMany({
            where: {
              playerId: follow.playerId,
              scoutId: {
                not: userId
              },
              scout: {
                clubId: user.clubId
              }
            }
          });

          followedByOtherScouts = otherScouts.length > 0;
          otherScoutsCount = otherScouts.length;
        }

        return {
          id: follow.id,
          playerId: follow.playerId,
          notes: follow.notes,
          createdAt: follow.createdAt.toISOString(),
          player: follow.player,
          followedByOtherScouts,
          otherScoutsCount
        };
      })
    );

    return res.status(200).json(followedPlayersWithInfo);
  } catch (error) {
    console.error('Error fetching following players:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}
