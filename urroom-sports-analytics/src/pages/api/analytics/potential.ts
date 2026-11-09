import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../auth/[...nextauth]';

type PotentialPredictionResponse = {
  potential_score: number;
  verdict: string;
  score_reliability?: string;
  scout_alert?: string | null;
  radar?: Record<string, number>;
  projections?: Record<string, Record<string, number>>;
  timeline?: Record<string, unknown>;
};

const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PotentialPredictionResponse | { error: string }>
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId, yearsAhead } = req.body ?? {};
  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'playerId is required' });
  }

  try {
    const response = await fetch(`${backendBaseUrl}/ai/players/${playerId}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        yearsAhead: typeof yearsAhead === 'number' ? yearsAhead : 4
      })
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.error || 'Failed to compute IA prediction'
      });
    }

    return res.status(200).json(payload as PotentialPredictionResponse);
  } catch (error) {
    console.error('Error while fetching IA potential prediction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
