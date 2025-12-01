import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

// Calculate Uroom Score based on average of all metrics
function calculateUroomScore(player: any) {
  // Get all metrics from all assessments
  const allMetrics: number[] = [];
  
  if (player.assessments && player.assessments.length > 0) {
    player.assessments.forEach((assessment: any) => {
      if (assessment.metrics && assessment.metrics.length > 0) {
        assessment.metrics.forEach((metric: any) => {
          allMetrics.push(metric.value);
        });
      }
    });
  }
  
  // If no metrics, return 0
  if (allMetrics.length === 0) {
    return 0;
  }
  
  // Calculate average of all metrics
  const average = allMetrics.reduce((sum, value) => sum + value, 0) / allMetrics.length;
  
  // Round to 2 decimals
  return Math.round(average * 100) / 100;
}

// Update all players' ranks
async function updatePlayerRankings() {
  try {
    const players = await prisma.playerProfile.findMany({
      include: {
        reports: true,
        assessments: {
          include: {
            metrics: true,
          },
        },
      },
    });

    // Calculate score for each player
    const playersWithScores = players.map(player => ({
      id: player.id,
      score: calculateUroomScore(player),
    }));

    // Sort by score descending
    playersWithScores.sort((a, b) => b.score - a.score);

    // Update each player with their rank and score
    for (let i = 0; i < playersWithScores.length; i++) {
      await prisma.playerProfile.update({
        where: { id: playersWithScores[i].id },
        data: {
          uroomScore: playersWithScores[i].score,
          uroomRank: i + 1,
        },
      });
    }

    return playersWithScores.length;
  } catch (error) {
    console.error('Error updating rankings:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Update rankings for all players
    const totalPlayers = await updatePlayerRankings();

    // Get current player's data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        players: true,
      },
    });

    if (!user?.players || user.players.length === 0) {
      return res.status(200).json({
        uroomRank: null,
        uroomScore: 0,
        totalPlayers,
      });
    }

    const player = user.players[0];

    return res.status(200).json({
      uroomRank: player.uroomRank,
      uroomScore: player.uroomScore,
      totalPlayers,
    });
  } catch (error) {
    console.error('Error in ranking API:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    await prisma.$disconnect();
  }
}
