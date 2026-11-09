import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Calculate Uroom Score based on average of all metrics
function calculateUroomScore(player) {
  const allMetrics = [];
  
  if (player.assessments && player.assessments.length > 0) {
    player.assessments.forEach((assessment) => {
      if (assessment.metrics && assessment.metrics.length > 0) {
        assessment.metrics.forEach((metric) => {
          allMetrics.push(metric.value);
        });
      }
    });
  }
  
  if (allMetrics.length === 0) {
    return 0;
  }
  
  const average = allMetrics.reduce((sum, value) => sum + value, 0) / allMetrics.length;
  return Math.round(average * 100) / 100;
}

async function updatePlayerRankings() {
  try {
    console.log('📊 Calcul des scores et classements...');
    
    const players = await prisma.playerProfile.findMany({
      include: {
        assessments: {
          include: {
            metrics: true,
          },
        },
      },
    });

    console.log(`✓ ${players.length} joueurs trouvés`);

    // Calculate score for each player
    const playersWithScores = players.map(player => ({
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      score: calculateUroomScore(player),
    }));

    // Sort by score descending
    playersWithScores.sort((a, b) => b.score - a.score);

    console.log('\n🏆 Top 10 des joueurs:');
    playersWithScores.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} - Score: ${p.score.toFixed(2)}`);
    });

    // Update each player with their rank and score
    console.log('\n⏳ Mise à jour de la base de données...');
    for (let i = 0; i < playersWithScores.length; i++) {
      await prisma.playerProfile.update({
        where: { id: playersWithScores[i].id },
        data: {
          uroomScore: playersWithScores[i].score,
          uroomRank: i + 1,
        },
      });
    }

    console.log(`\n✅ Classement mis à jour pour ${playersWithScores.length} joueurs!`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updatePlayerRankings();
