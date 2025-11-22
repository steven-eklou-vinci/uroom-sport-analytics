import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: 'Non authentifié' });
  }

  if (session.user.role !== 'SCOUT' && session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Accès interdit' });
  }

  const { playerId } = req.query;

  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ message: 'ID joueur manquant' });
  }

  const userId = session.user.id;

  try {
    if (req.method === 'POST') {
      // Follow a player
      const { notes } = req.body;

      // Check if already following
      const existing = await prisma.playerFollow.findUnique({
        where: {
          scoutId_playerId: {
            scoutId: userId,
            playerId: playerId
          }
        }
      });

      if (existing) {
        return res.status(400).json({ message: 'Vous suivez déjà ce joueur' });
      }

      // Create follow
      const follow = await prisma.playerFollow.create({
        data: {
          scoutId: userId,
          playerId: playerId,
          notes: notes || null
        },
        include: {
          player: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return res.status(201).json({ 
        message: `Vous suivez maintenant ${follow.player.firstName} ${follow.player.lastName}`,
        follow 
      });

    } else if (req.method === 'DELETE') {
      // Unfollow a player
      const follow = await prisma.playerFollow.findUnique({
        where: {
          scoutId_playerId: {
            scoutId: userId,
            playerId: playerId
          }
        }
      });

      if (!follow) {
        return res.status(404).json({ message: 'Vous ne suivez pas ce joueur' });
      }

      await prisma.playerFollow.delete({
        where: {
          id: follow.id
        }
      });

      return res.status(200).json({ message: 'Joueur retiré de vos suivis' });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error managing player follow:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}
