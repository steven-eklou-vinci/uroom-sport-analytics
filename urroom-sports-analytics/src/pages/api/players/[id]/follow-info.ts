import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'SCOUT') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id: playerId } = req.query;

  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  try {
    const userId = session.user.id;
    
    // Fetch user to get clubId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, clubId: true, email: true }
    });
    
    const userClubId = user?.clubId;
    
    console.log('=== Follow Info Debug ===');
    console.log('User:', user);
    console.log('Player ID:', playerId);

    // Check if current scout is following this player
    const currentFollow = await prisma.playerFollow.findUnique({
      where: {
        scoutId_playerId: {
          scoutId: userId,
          playerId: playerId
        }
      }
    });
    
    console.log('Current follow:', currentFollow);

    // Check if other scouts from the same club are following this player
    let otherScoutsCount = 0;
    let otherScouts: { name: string; email: string }[] = [];
    if (userClubId) {
      const otherFollows = await prisma.playerFollow.findMany({
        where: {
          playerId: playerId,
          scoutId: { not: userId },
          scout: {
            clubId: userClubId
          }
        },
        include: {
          scout: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
      
      console.log('Other follows found:', otherFollows.length);
      console.log('Other follows:', otherFollows);
      
      otherScoutsCount = otherFollows.length;
      otherScouts = otherFollows.map(f => ({
        name: f.scout.name,
        email: f.scout.email
      }));
    } else {
      console.log('No clubId for user');
    }

    return res.status(200).json({
      isFollowing: !!currentFollow,
      followedByOtherScouts: otherScoutsCount > 0,
      otherScoutsCount,
      otherScouts
    });
  } catch (error) {
    console.error('Error fetching follow info:', error);
    return res.status(500).json({ error: 'Failed to fetch follow info' });
  }
}
