import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

// Calculate age from birthdate
function calculateAge(birthDate: Date): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    // Get all players with their scores and ranks
    const players = await prisma.playerProfile.findMany({
      where: {
        uroomRank: {
          not: null,
        },
      },
      orderBy: {
        uroomRank: 'asc',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        nationality: true,
        positions: true,
        uroomScore: true,
        uroomRank: true,
        userId: true,
        photoUrl: true,
      },
    });

    // Format the data
    const rankedPlayers = players.map(player => ({
      id: player.id,
      rank: player.uroomRank || 0,
      firstName: player.firstName,
      lastName: player.lastName,
      nationality: player.nationality,
      positions: player.positions,
      uroomScore: player.uroomScore || 0,
      age: calculateAge(player.birthDate),
      photoUrl: player.photoUrl,
    }));

    // Get current user's rank if authenticated
    let currentUserRank = null;
    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          players: {
            select: {
              uroomRank: true,
            },
          },
        },
      });

      if (user?.players && user.players.length > 0) {
        currentUserRank = user.players[0].uroomRank;
      }
    }

    return res.status(200).json({
      players: rankedPlayers,
      currentUserRank,
      totalPlayers: rankedPlayers.length,
    });
  } catch (error) {
    console.error('Error in ranking API:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    await prisma.$disconnect();
  }
}
