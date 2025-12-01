import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Player ID is required' });
  }

  try {
    // Récupérer le joueur avec ses informations complètes
    const playerProfile = await prisma.playerProfile.findUnique({
      where: { id: id },
      include: {
        assessments: {
          orderBy: {
            date: 'desc',
          },
          take: 1,
          include: {
            metrics: true,
          },
        },
      },
    });

    if (!playerProfile) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Calculer l'âge
    const calculateAge = (birthDate: Date): number => {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Extraire les métriques de l'assessment le plus récent
    const metrics: { [key: string]: number } = {};
    if (playerProfile.assessments.length > 0) {
      const latestAssessment = playerProfile.assessments[0];
      // Les métriques sont dans la table Metric reliée à l'assessment
      latestAssessment.metrics.forEach((metric) => {
        metrics[metric.key] = metric.value;
      });
    }

    // Construire la réponse
    const playerDetail = {
      id: playerProfile.id,
      firstName: playerProfile.firstName,
      lastName: playerProfile.lastName,
      photoUrl: playerProfile.photoUrl,
      birthDate: playerProfile.birthDate.toISOString(),
      age: calculateAge(playerProfile.birthDate),
      nationality: playerProfile.nationality,
      positions: playerProfile.positions,
      foot: playerProfile.foot,
      heightCm: playerProfile.heightCm,
      weightKg: playerProfile.weightKg,
      uroomScore: playerProfile.uroomScore || 0,
      uroomRank: playerProfile.uroomRank || 999,
      videoUrls: playerProfile.videoUrls || [],
      metrics,
    };

    return res.status(200).json(playerDetail);
  } catch (error) {
    console.error('Error fetching player detail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
