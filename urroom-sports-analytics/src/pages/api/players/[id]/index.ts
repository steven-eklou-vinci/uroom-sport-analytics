import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id: playerId } = req.query;

  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  if (req.method === 'GET') {
    try {
      const player = await prisma.playerProfile.findUnique({
        where: { id: playerId },
        include: {
          user: {
            select: {
              email: true
            }
          }
        }
      });

      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      return res.status(200).json(player);
    } catch (error) {
      console.error('Error fetching player:', error);
      return res.status(500).json({ error: 'Failed to fetch player' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
