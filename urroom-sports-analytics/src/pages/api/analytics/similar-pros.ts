import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';

import { authOptions } from '../auth/[...nextauth]';

const prisma = new PrismaClient();
const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type SimilarProsPayload = {
  trajectory_score?: number;
  best_match?: { pro_name?: string | null; similarity_score?: number | null };
  snapshots?: Array<{
    age: number;
    season: string;
    similar_pros: Array<{
      pro_name: string;
      pro_player_id?: string;
      similarity_score: number;
      mahalanobis_dist?: number;
    }>;
  }>;
  message?: string;
};

function normalizeScore(score: number | undefined): number {
  const value = Number(score || 0);
  if (!Number.isFinite(value)) return 0;
  return value <= 1 ? Math.max(0, Math.min(100, value * 100)) : Math.max(0, Math.min(100, value));
}

function extractBaseName(name: string): string {
  return String(name || '').split('(')[0].trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId, topK } = req.body ?? {};
  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'playerId is required' });
  }

  try {
    const response = await fetch(`${backendBaseUrl}/ai/players/${playerId}/similar-pros?top_k=${Number(topK || 5)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as SimilarProsPayload) : null;

    if (!response.ok || !payload) {
      return res.status(response.ok ? 500 : response.status).json({
        error: (payload as any)?.error || 'Failed to compute IA similar pros'
      });
    }

    const snapshots = Array.isArray(payload.snapshots) ? payload.snapshots : [];
    const latestSnapshot = snapshots.length
      ? [...snapshots].sort((a, b) => Number(b.age || 0) - Number(a.age || 0))[0]
      : null;

    const topSimilar = latestSnapshot?.similar_pros?.slice(0, Number(topK || 5)) || [];

    const proRecords = await Promise.all(
      topSimilar.map(async (item) => {
        const baseName = extractBaseName(item.pro_name);
        const found = await prisma.proPlayerProfile.findFirst({
          where: {
            name: {
              contains: baseName
            }
          }
        });
        return { item, found, baseName };
      })
    );

    const comparisons = proRecords.map(({ item, found, baseName }, index) => {
      const score = normalizeScore(item.similarity_score);
      const trajectory = normalizeScore(payload.trajectory_score);
      const confidence = Math.max(0.3, Math.min(0.95, score / 100));
      const mahal = Number(item.mahalanobis_dist || 0);

      return {
        id: `${playerId}-${baseName}-${index}`,
        matchScore: Math.round(score),
        similarities: [
          `Similarite IA globale: ${Math.round(score)}%`,
          payload.message || `Projection de trajectoire vers ${baseName}`
        ],
        differences: mahal > 0 ? [`Distance statistique: ${mahal.toFixed(2)}`] : [],
        technicalMatch: Math.max(35, Math.min(98, Math.round(score + 2))),
        physicalMatch: Math.max(30, Math.min(96, Math.round(score - 3))),
        styleMatch: Math.max(30, Math.min(98, Math.round(score + 1))),
        playerAge: Math.round(Number(latestSnapshot?.age || 16)),
        proPlayerAge: Math.round(Number(latestSnapshot?.age || 16)),
        confidence,
        trajectoryScore: Math.round(trajectory),
        proPlayer: {
          name: item.pro_name || baseName,
          currentClub: found?.currentClub || undefined,
          nationality: found?.nationality || 'N/A',
          positions: found?.positions?.length ? found.positions : ['Profil similaire'],
          photoUrl: found?.photoUrl || undefined,
          currentLeague: found?.currentLeague || 'Reference IA',
          marketValue: found?.marketValue || undefined,
          playingStyle: found?.playingStyle?.length ? found.playingStyle : ['Donnees IA']
        }
      };
    });

    return res.status(200).json(comparisons);
  } catch (error) {
    console.error('Error while fetching IA similar pros:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
