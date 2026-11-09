import type { NextApiRequest, NextApiResponse } from 'next';

// Cette API route agit maintenant comme un proxy vers l'API FastAPI (uroom-ia)
// pour toutes les comparaisons IA. Plus de seed ni de Prisma ici !

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { playerId } = req.query;

  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'playerId requis' });
  }

  // On suppose que le frontend envoie les snapshots du joueur dans le body pour POST
  // et que GET n'est plus utilisé (ou on peut le désactiver)

  if (req.method === 'POST') {
    try {
      // Appel à l'API FastAPI (uroom-ia) pour obtenir les comparaisons IA
      const fastApiUrl = `http://localhost:8000/player/similar-pros`;
      const response = await fetch(fastApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('Erreur appel FastAPI:', error);
      return res.status(500).json({ error: 'Erreur serveur FastAPI' });
    }
  }

  // GET désactivé (ou à adapter si besoin)
  return res.status(405).json({ error: 'Méthode non supportée, utilisez POST' });
}
function calculatePlayerStats(assessments: any[]) {
  const statsByCategory: { [key: string]: number[] } = {};

  assessments.forEach(assessment => {
    assessment.metrics.forEach((metric: any) => {
      const category = metric.key.split(' - ')[0]; // ex: "Technique - Contrôle" -> "Technique"
      if (!statsByCategory[category]) {
        statsByCategory[category] = [];
      }
      statsByCategory[category].push(metric.value);
    });
  });

  // Calculer les moyennes
  const averages: { [key: string]: number } = {};
  Object.entries(statsByCategory).forEach(([category, values]) => {
    averages[category] = values.reduce((a, b) => a + b, 0) / values.length;
  });

  return averages;
}
/**
 * Génère des stats par défaut basées sur la position et le uroomScore
 * Utilisé quand le joueur n'a pas encore d'évaluations
 */
function getDefaultStatsForPosition(positions: string[], uroomScore: number): { [key: string]: number } {
  // Normaliser le uroomScore (0-100 -> 0-10)
  const baseScore = Math.max(4, Math.min(8, uroomScore / 10));
  
  // Profils par type de poste
  const positionProfiles: { [key: string]: { [key: string]: number } } = {
    // Attaquants : fort en technique et physique, moyen en tactique
    'Attaquant': {
      Technique: baseScore + 0.5,
      Physique: baseScore + 0.3,
      Tactique: baseScore - 0.2,
      Mental: baseScore
    },
    'Ailier gauche': {
      Technique: baseScore + 0.4,
      Physique: baseScore + 0.5,
      Tactique: baseScore - 0.1,
      Mental: baseScore
    },
    'Ailier droit': {
      Technique: baseScore + 0.4,
      Physique: baseScore + 0.5,
      Tactique: baseScore - 0.1,
      Mental: baseScore
    },
    
    // Milieux : équilibrés
    'Milieu central': {
      Technique: baseScore + 0.2,
      Physique: baseScore,
      Tactique: baseScore + 0.4,
      Mental: baseScore + 0.2
    },
    'Milieu offensif': {
      Technique: baseScore + 0.6,
      Physique: baseScore - 0.2,
      Tactique: baseScore + 0.3,
      Mental: baseScore
    },
    'Milieu défensif': {
      Technique: baseScore,
      Physique: baseScore + 0.3,
      Tactique: baseScore + 0.5,
      Mental: baseScore + 0.3
    },
    
    // Défenseurs : fort en physique et tactique
    'Défenseur central': {
      Technique: baseScore - 0.2,
      Physique: baseScore + 0.5,
      Tactique: baseScore + 0.4,
      Mental: baseScore + 0.3
    },
    'Latéral gauche': {
      Technique: baseScore + 0.1,
      Physique: baseScore + 0.4,
      Tactique: baseScore + 0.2,
      Mental: baseScore
    },
    'Latéral droit': {
      Technique: baseScore + 0.1,
      Physique: baseScore + 0.4,
      Tactique: baseScore + 0.2,
      Mental: baseScore
    },
    
    // Gardien
    'Gardien de but': {
      Technique: baseScore + 0.2,
      Physique: baseScore + 0.3,
      Tactique: baseScore + 0.4,
      Mental: baseScore + 0.5
    }
  };

  // Trouver le profil le plus proche
  let matchedProfile = positionProfiles['Milieu central']; // Défaut
  
  for (const position of positions) {
    if (positionProfiles[position]) {
      matchedProfile = positionProfiles[position];
      break;
    }
  }

  // Ajouter un peu de variation aléatoire (+/- 0.3)
  const stats: { [key: string]: number } = {};
  Object.entries(matchedProfile).forEach(([category, value]) => {
    const variation = (Math.random() - 0.5) * 0.6;
    stats[category] = Math.max(3, Math.min(10, value + variation));
  });

  return stats;
}

/**
 * Calcule le score de correspondance entre un joueur et un pro
 */
function calculateMatchScore(
  player: any,
  playerAge: number,
  playerStats: { [key: string]: number },
  proPlayer: any
) {
  try {
    // Récupérer les stats historiques du pro à un âge similaire (+/- 2 ans)
    const historicalStats = proPlayer.historicalStats as any;
    
    // Trouver l'âge le plus proche dans les stats historiques
    let closestAge = null;
    let minDiff = Infinity;
    
    Object.keys(historicalStats).forEach(age => {
      const diff = Math.abs(parseInt(age) - playerAge);
      if (diff < minDiff && diff <= 2) {
        minDiff = diff;
        closestAge = age;
      }
    });

    if (!closestAge) {
      return null; // Pas de données comparables
    }

    const proStatsAtAge = historicalStats[closestAge];

    // 1. Calculer la similarité technique
    const technicalMatch = calculateCategoryMatch(
      playerStats.Technique || 0,
      proStatsAtAge.technical || 0
    );

    // 2. Calculer la similarité physique
    const physicalMatch = calculateCategoryMatch(
      playerStats.Physique || 0,
      proStatsAtAge.physical || 0
    );

    // 3. Calculer la similarité tactique
    const tacticalMatch = calculateCategoryMatch(
      playerStats.Tactique || 0,
      proStatsAtAge.tactical || 0
    );

    // 4. Calculer la similarité mentale
    const mentalMatch = calculateCategoryMatch(
      playerStats.Mental || 0,
      proStatsAtAge.mental || 0
    );

    // 5. Vérifier les positions communes
    const commonPositions = player.positions.filter((pos: string) => 
      proPlayer.positions.includes(pos)
    );
    const positionBonus = (commonPositions.length / player.positions.length) * 10;

    // 6. Score de style (basé sur les tags du joueur et le style du pro)
    const styleMatch = calculateStyleMatch(player.tags, proPlayer.playingStyle);

    // 7. Calculer le match score global
    const matchScore = Math.min(100, Math.round(
      (technicalMatch * 0.3) +
      (physicalMatch * 0.2) +
      (tacticalMatch * 0.2) +
      (mentalMatch * 0.15) +
      (styleMatch * 0.1) +
      (positionBonus * 0.05)
    ));

    // 8. Identifier les similarités et différences
    const similarities: string[] = [];
    const differences: string[] = [];

    if (technicalMatch > 70) similarities.push(`Niveau technique similaire (${technicalMatch.toFixed(0)}% match)`);
    else if (technicalMatch < 50) differences.push(`Niveau technique différent`);

    if (physicalMatch > 70) similarities.push(`Profil physique comparable (${physicalMatch.toFixed(0)}% match)`);
    else if (physicalMatch < 50) differences.push(`Profil physique différent`);

    if (commonPositions.length > 0) {
      similarities.push(`Même position: ${commonPositions.join(', ')}`);
    }

    if (styleMatch > 60) {
      similarities.push(`Style de jeu similaire`);
    }

    // Comparaison de nationalité
    if (player.nationality === proPlayer.nationality) {
      similarities.push(`Même nationalité (${player.nationality})`);
    }

    // 9. Calculer la confiance basée sur la quantité de données
    const dataPoints = player.assessments.length;
    let confidence: number;
    
    if (dataPoints === 0) {
      // Sans évaluations, confiance très faible (20-30%)
      confidence = 0.2 + (Math.random() * 0.1);
    } else {
      // Avec évaluations, confiance augmente avec le nombre
      confidence = Math.min(1.0, dataPoints / 10);
    }

    return {
      proPlayerId: proPlayer.id,
      matchScore,
      similarities,
      differences,
      technicalMatch,
      physicalMatch,
      styleMatch,
      proPlayerAge: parseInt(closestAge),
      confidence
    };
  } catch (error) {
    console.error('Erreur calcul match score:', error);
    return null;
  }
}

/**
 * Calcule le pourcentage de correspondance entre deux valeurs (0-100)
 */
function calculateCategoryMatch(playerValue: number, proValue: number): number {
  const maxDiff = 10; // Différence maximum attendue
  const diff = Math.abs(playerValue - proValue);
  const match = Math.max(0, 100 - (diff / maxDiff) * 100);
  return match;
}

/**
 * Calcule la correspondance de style de jeu
 */
function calculateStyleMatch(playerTags: string[], proStyle: string[]): number {
  if (playerTags.length === 0 || proStyle.length === 0) {
    return 50; // Score neutre si pas d'info
  }

  // Normaliser les tags (lowercase, trim)
  const normalizedPlayerTags = playerTags.map(t => t.toLowerCase().trim());
  const normalizedProStyle = proStyle.map(s => s.toLowerCase().trim());

  // Compter les correspondances
  const matches = normalizedPlayerTags.filter(tag => 
    normalizedProStyle.some(style => 
      style.includes(tag) || tag.includes(style)
    )
  ).length;

  // Calculer le pourcentage
  const matchPercentage = (matches / Math.max(normalizedPlayerTags.length, normalizedProStyle.length)) * 100;
  
  return Math.min(100, matchPercentage);
}
