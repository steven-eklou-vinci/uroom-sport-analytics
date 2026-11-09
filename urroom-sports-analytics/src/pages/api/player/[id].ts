import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
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
    const session = await getServerSession(req, res, authOptions);
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
        matchAppearances: {
          where: { associationConfirmed: true },
          include: {
            match: {
              select: {
                id: true,
                title: true,
                opponent: true,
                matchDate: true,
                createdAt: true,
                createdById: true,
              },
            },
            statistics: true,
          },
          orderBy: { match: { createdAt: 'desc' } },
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
      birthDate: playerProfile.birthDate?.toISOString() || null,
      age: playerProfile.birthDate
        ? calculateAge(playerProfile.birthDate)
        : playerProfile.age,
      nationality: playerProfile.nationality,
      positions: playerProfile.positions,
      foot: playerProfile.foot,
      heightCm: playerProfile.heightCm,
      weightKg: playerProfile.weightKg,
      uroomScore: playerProfile.uroomScore || 0,
      uroomRank: playerProfile.uroomRank || 999,
      videoUrls: playerProfile.videoUrls || [],
      metrics,
      matchAppearances: playerProfile.matchAppearances
        .filter((appearance) => {
          if (session?.user?.role === 'ADMIN') return true;
          if (session?.user?.role === 'SCOUT') {
            return appearance.match.createdById === session.user.id;
          }
          return session?.user?.role === 'PLAYER' && playerProfile.userId === session.user.id;
        })
        .map((appearance) => ({
          id: appearance.id,
          trackId: appearance.trackId,
          title: appearance.match.title,
          opponent: appearance.match.opponent,
          matchDate: appearance.match.matchDate?.toISOString() || null,
          createdAt: appearance.match.createdAt.toISOString(),
          statistics: appearance.statistics,
        })),
    };

    return res.status(200).json(playerDetail);
  } catch (error) {
    console.error('Error fetching player detail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
