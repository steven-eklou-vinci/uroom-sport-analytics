import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';

import { authOptions } from '../auth/[...nextauth]';

type TeamComparisonPlayer = {
  player_id: string;
  ml_score: number;
  verdict: string;
  multiplier: number;
  age: number;
  avg_current: number;
  avg_future: number;
  gain_total: number;
  radar_current?: Record<string, number>;
};

type TeamComparisonResponse = {
  count: number;
  years_ahead: number;
  players: TeamComparisonPlayer[];
};

const prisma = new PrismaClient();
const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function mapPositionToModel(position: string | undefined): string {
  const value = String(position || '').toUpperCase();
  if (value.includes('GK') || value.includes('GOAL')) return 'GK';
  if (value.includes('DEF') || value.includes('CB') || value.includes('LB') || value.includes('RB')) return 'DEF';
  if (value.includes('MID') || value.includes('CM') || value.includes('DM') || value.includes('AM')) return 'MID';
  return 'FWD';
}

function toSeasonLabel(date: Date | string): string {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  if (month >= 7) return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
  return `${year - 1}-${String(year % 100).padStart(2, '0')}`;
}

function calculateAgeFromBirthDate(birthDate?: Date | null): number {
  if (!birthDate) return 15;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(11, Math.min(19, age));
}

function metricValue(metrics: Array<{ key: string; value: number }>, key: string, fallback = 0): number {
  const metric = metrics.find((entry) => entry.key === key);
  if (!metric) return fallback;
  const value = Number(metric.value);
  return Number.isFinite(value) ? value : fallback;
}

function buildPlayerSnapshots(player: any) {
  const fallbackAge = calculateAgeFromBirthDate(player.birthDate);
  const birthDate = player.birthDate
    ? new Date(player.birthDate).toISOString().slice(0, 10)
    : `${new Date().getUTCFullYear() - fallbackAge}-06-15`;

  const snapshots = (player.assessments || []).map((assessment: any) => {
    const assessmentDate = new Date(assessment.date);
    const age = player.birthDate
      ? Number(((assessmentDate.getTime() - new Date(player.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000)).toFixed(2))
      : Number(fallbackAge);

    return {
      player_id: `${player.firstName} ${player.lastName}`,
      birth_date: birthDate,
      position: mapPositionToModel(player.positions?.[0]),
      dominant_foot: String(player.foot || 'right').toLowerCase().includes('left') ? 'left' : 'right',
      nationality: player.nationality || 'BE',
      academy: 'Uroom Academy',
      is_pro: 0,
      snapshot_date: assessmentDate.toISOString().slice(0, 10),
      season: toSeasonLabel(assessmentDate),
      age,
      competition_level: Math.max(1, Math.min(5, Math.round(metricValue(assessment.metrics || [], 'competition_level', 3)))),
      height_cm: metricValue(assessment.metrics || [], 'height_cm', Number(player.heightCm || 0)),
      weight_kg: metricValue(assessment.metrics || [], 'weight_kg', Number(player.weightKg || 0)),
      sitting_height_cm: metricValue(assessment.metrics || [], 'sitting_height_cm', 0),
      sprint_10m_sec: metricValue(assessment.metrics || [], 'sprint_10m_sec', 0),
      sprint_30m_sec: metricValue(assessment.metrics || [], 'sprint_30m_sec', 0),
      jump_cm: metricValue(assessment.metrics || [], 'jump_cm', 0),
      endurance_score: metricValue(assessment.metrics || [], 'endurance_score', 0),
      matches_played: Math.round(metricValue(assessment.metrics || [], 'matches_played', 0)),
      minutes_played: Math.round(metricValue(assessment.metrics || [], 'minutes_played', 0)),
      pass_accuracy_pct: metricValue(assessment.metrics || [], 'pass_accuracy_pct', 0),
      dribble_success_pct: metricValue(assessment.metrics || [], 'dribble_success_pct', 0),
      shots_on_target_pct: metricValue(assessment.metrics || [], 'shots_on_target_pct', 0),
      duels_won_pct: metricValue(assessment.metrics || [], 'duels_won_pct', 0),
      interceptions_per90: metricValue(assessment.metrics || [], 'interceptions_per90', 0),
      goals_per90: metricValue(assessment.metrics || [], 'goals_per90', 0),
      assists_per90: metricValue(assessment.metrics || [], 'assists_per90', 0),
      avg_scout_score: metricValue(assessment.metrics || [], 'avg_scout_score', 0),
      scout_observation_count: Math.round(metricValue(assessment.metrics || [], 'scout_observation_count', 1))
    };
  });

  if (snapshots.length > 0) {
    return snapshots;
  }

  // Fallback to one synthetic snapshot if no assessment exists yet.
  const syntheticAge = Number(fallbackAge);
  return [{
    player_id: `${player.firstName} ${player.lastName}`,
    birth_date: birthDate,
    position: mapPositionToModel(player.positions?.[0]),
    dominant_foot: String(player.foot || 'right').toLowerCase().includes('left') ? 'left' : 'right',
    nationality: player.nationality || 'BE',
    academy: 'Uroom Academy',
    is_pro: 0,
    snapshot_date: new Date().toISOString().slice(0, 10),
    season: toSeasonLabel(new Date()),
    age: syntheticAge,
    competition_level: 3,
    height_cm: Number(player.heightCm || 0),
    weight_kg: Number(player.weightKg || 0),
    sitting_height_cm: 0,
    sprint_10m_sec: 0,
    sprint_30m_sec: 0,
    jump_cm: 0,
    endurance_score: 0,
    matches_played: 0,
    minutes_played: 0,
    pass_accuracy_pct: 0,
    dribble_success_pct: 0,
    shots_on_target_pct: 0,
    duels_won_pct: 0,
    interceptions_per90: 0,
    goals_per90: 0,
    assists_per90: 0,
    avg_scout_score: 0,
    scout_observation_count: 0
  }];
}

function pickHistoricalStat(stats: Record<string, any> | null | undefined, targetAge: number) {
  if (!stats || typeof stats !== 'object') return null;
  const entries = Object.entries(stats)
    .map(([age, values]) => ({ age: Number(age), values }))
    .filter((entry) => Number.isFinite(entry.age) && entry.values && typeof entry.values === 'object');

  if (!entries.length) return null;
  entries.sort((a, b) => Math.abs(a.age - targetAge) - Math.abs(b.age - targetAge));
  return { age: entries[0].age, values: entries[0].values as Record<string, number> };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildProSnapshot(pro: any, referenceAge: number) {
  const historical = pickHistoricalStat(pro.historicalStats as Record<string, any>, referenceAge);
  const technical = clamp(Number(historical?.values?.technical ?? 6.5), 4.5, 9.5);
  const physical = clamp(Number(historical?.values?.physical ?? 6.5), 4.5, 9.5);
  const tactical = clamp(Number(historical?.values?.tactical ?? 6.5), 4.5, 9.5);
  const mental = clamp(Number(historical?.values?.mental ?? 6.5), 4.5, 9.8);

  const age = historical?.age || referenceAge;
  const snapshotDate = new Date();
  snapshotDate.setUTCFullYear(snapshotDate.getUTCFullYear() - Math.max(0, (18 - age)));

  return {
    player_id: pro.name,
    birth_date: new Date(pro.birthDate).toISOString().slice(0, 10),
    position: mapPositionToModel(pro.positions?.[0]),
    dominant_foot: 'right',
    nationality: pro.nationality || 'BE',
    academy: pro.currentClub || 'Pro Academy',
    is_pro: 1,
    snapshot_date: snapshotDate.toISOString().slice(0, 10),
    season: toSeasonLabel(snapshotDate),
    age,
    competition_level: 1,
    height_cm: 178,
    weight_kg: 72,
    sitting_height_cm: 0,
    sprint_10m_sec: clamp(2.18 - ((physical - 5) * 0.06), 1.55, 2.3),
    sprint_30m_sec: clamp(5.1 - ((physical - 5) * 0.12), 3.8, 5.4),
    jump_cm: Math.round(26 + physical * 5),
    endurance_score: Math.round(physical * 10),
    matches_played: 24,
    minutes_played: 1850,
    pass_accuracy_pct: Math.round(clamp(technical * 10 + tactical * 2, 45, 95)),
    dribble_success_pct: Math.round(clamp(technical * 9 + mental, 40, 92)),
    shots_on_target_pct: Math.round(clamp(technical * 8 + 15, 35, 88)),
    duels_won_pct: Math.round(clamp(physical * 8 + tactical, 35, 92)),
    interceptions_per90: Number(clamp((tactical / 10) * 3.8, 0.4, 4.2).toFixed(2)),
    goals_per90: Number(clamp((technical + mental) / 30, 0.05, 0.9).toFixed(2)),
    assists_per90: Number(clamp((technical + tactical) / 35, 0.05, 0.8).toFixed(2)),
    avg_scout_score: Number(((technical + physical + tactical + mental) / 4).toFixed(2)),
    scout_observation_count: 8
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TeamComparisonResponse | { error: string }>
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
    const player = await prisma.playerProfile.findUnique({
      where: { id: playerId },
      include: {
        assessments: {
          include: { metrics: true },
          orderBy: { date: 'asc' },
          take: 8
        }
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const proPlayers = await prisma.proPlayerProfile.findMany({
      where: {
        positions: {
          hasSome: player.positions || []
        }
      },
      take: 5,
      orderBy: {
        marketValue: 'desc'
      }
    });

    const playerAge = calculateAgeFromBirthDate(player.birthDate);

    const playersPayload = [
      { snapshots: buildPlayerSnapshots(player) },
      ...proPlayers.map((pro) => ({ snapshots: [buildProSnapshot(pro, playerAge)] }))
    ];

    const response = await fetch(`${backendBaseUrl}/ai/compare/team`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        years_ahead: typeof yearsAhead === 'number' ? yearsAhead : 4,
        players: playersPayload
      })
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.error || 'Failed to compute team comparison'
      });
    }

    return res.status(200).json(payload as TeamComparisonResponse);
  } catch (error) {
    console.error('Error while fetching IA team comparison:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
