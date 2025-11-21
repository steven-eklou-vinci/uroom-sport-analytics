import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'SCOUT') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userId = session.user.id;
    
    // Fetch user to get clubId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { clubId: true }
    });
    
    const userClubId = user?.clubId;
    
    console.log('Scout userId:', userId);
    console.log('Scout clubId:', userClubId);

    // Fetch all players
    const players = await prisma.playerProfile.findMany({
      orderBy: { lastName: 'asc' }
    });

    // Fetch all follows for current scout
    const myFollows = await prisma.playerFollow.findMany({
      where: { scoutId: userId },
      select: { playerId: true }
    });

    const myFollowIds = new Set(myFollows.map(f => f.playerId));
    
    console.log('My follows:', myFollows.length);

    // Fetch all follows from other scouts in the same club
    let otherScoutsFollows: { playerId: string }[] = [];
    if (userClubId) {
      otherScoutsFollows = await prisma.playerFollow.findMany({
        where: {
          scoutId: { not: userId },
          scout: {
            clubId: userClubId
          }
        },
        select: { playerId: true }
      });
      
      console.log('Other scouts follows:', otherScoutsFollows.length);
    } else {
      console.log('No clubId found for scout');
    }

    // Count follows per player from other scouts
    const followCounts: { [playerId: string]: number } = {};
    otherScoutsFollows.forEach(follow => {
      followCounts[follow.playerId] = (followCounts[follow.playerId] || 0) + 1;
    });

    // Enrich players with follow info
    const enrichedPlayers = players.map(player => ({
      ...player,
      isFollowing: myFollowIds.has(player.id),
      followedByOtherScouts: (followCounts[player.id] || 0) > 0,
      otherScoutsCount: followCounts[player.id] || 0
    }));
    
    console.log('Enriched players sample:', enrichedPlayers.slice(0, 3).map(p => ({
      name: `${p.firstName} ${p.lastName}`,
      isFollowing: p.isFollowing,
      followedByOtherScouts: p.followedByOtherScouts,
      otherScoutsCount: p.otherScoutsCount
    })));

    return res.status(200).json(enrichedPlayers);
  } catch (error) {
    console.error('Error fetching players with follow status:', error);
    return res.status(500).json({ error: 'Failed to fetch players' });
  }
}
