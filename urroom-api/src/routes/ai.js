import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const defaultModelBaseUrl = process.env.IA_MODEL_URL || 'http://localhost:8000';
const serviceToken = process.env.IA_SERVICE_TOKEN;

function normalizeModelBaseUrl(url) {
  return String(url || defaultModelBaseUrl).replace(/\/+$/, '');
}

function mapPositionToModel(position) {
  const value = String(position || '').toUpperCase();
  if (value.includes('GK') || value.includes('GOAL')) return 'GK';
  if (value.includes('DEF') || value.includes('CB') || value.includes('LB') || value.includes('RB')) return 'DEF';
  if (value.includes('MID') || value.includes('CM') || value.includes('DM') || value.includes('AM')) return 'MID';
  return 'FWD';
}

function mapFootToModel(foot) {
  const value = String(foot || '').toLowerCase();
  if (value.includes('left') || value.includes('gauch')) return 'left';
  if (value.includes('both') || value.includes('ambi')) return 'both';
  return 'right';
}

function toSeasonLabel(date) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  if (month >= 7) {
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
  }
  return `${year - 1}-${String(year % 100).padStart(2, '0')}`;
}

function toBirthDateISO(player) {
  if (player.birthDate) {
    return new Date(player.birthDate).toISOString().slice(0, 10);
  }
  const now = new Date();
  const fallbackAge = Number(player.age || 14);
  const estimatedYear = now.getUTCFullYear() - Math.max(11, Math.min(18, Math.round(fallbackAge)));
  return `${estimatedYear}-06-15`;
}

function metricValue(metrics, key, fallback = 0) {
  const metric = metrics.find((entry) => entry.key === key);
  if (!metric) return fallback;
  const value = Number(metric.value);
  return Number.isFinite(value) ? value : fallback;
}

function buildPlayerSnapshots(player) {
  if (!player?.assessments?.length) return [];

  return player.assessments.map((assessment) => {
    const age = player.birthDate
      ? Number(((new Date(assessment.date).getTime() - new Date(player.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000)).toFixed(2))
      : Number(player.age || 14);

    return {
      player_id: player.id,
      birth_date: toBirthDateISO(player),
      position: mapPositionToModel(player.positions?.[0]),
      dominant_foot: mapFootToModel(player.foot),
      nationality: player.nationality || 'BE',
      academy: 'Uroom Academy',
      is_pro: 0,
      snapshot_date: new Date(assessment.date).toISOString().slice(0, 10),
      season: toSeasonLabel(assessment.date),
      age,
      competition_level: Math.max(1, Math.min(5, Math.round(metricValue(assessment.metrics, 'competition_level', 3)))),
      height_cm: metricValue(assessment.metrics, 'height_cm', Number(player.heightCm || 0)),
      weight_kg: metricValue(assessment.metrics, 'weight_kg', Number(player.weightKg || 0)),
      sitting_height_cm: metricValue(assessment.metrics, 'sitting_height_cm', 0),
      sprint_10m_sec: metricValue(assessment.metrics, 'sprint_10m_sec', 0),
      sprint_30m_sec: metricValue(assessment.metrics, 'sprint_30m_sec', 0),
      jump_cm: metricValue(assessment.metrics, 'jump_cm', 0),
      endurance_score: metricValue(assessment.metrics, 'endurance_score', 0),
      matches_played: Math.round(metricValue(assessment.metrics, 'matches_played', 0)),
      minutes_played: Math.round(metricValue(assessment.metrics, 'minutes_played', 0)),
      pass_accuracy_pct: metricValue(assessment.metrics, 'pass_accuracy_pct', 0),
      dribble_success_pct: metricValue(assessment.metrics, 'dribble_success_pct', 0),
      shots_on_target_pct: metricValue(assessment.metrics, 'shots_on_target_pct', 0),
      duels_won_pct: metricValue(assessment.metrics, 'duels_won_pct', 0),
      interceptions_per90: metricValue(assessment.metrics, 'interceptions_per90', 0),
      goals_per90: metricValue(assessment.metrics, 'goals_per90', 0),
      assists_per90: metricValue(assessment.metrics, 'assists_per90', 0),
      avg_scout_score: metricValue(assessment.metrics, 'avg_scout_score', 0),
      scout_observation_count: Math.round(metricValue(assessment.metrics, 'scout_observation_count', 1))
    };
  });
}

async function callModel(path, payload) {
  const baseUrl = normalizeModelBaseUrl(defaultModelBaseUrl);
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(serviceToken ? { 'x-uroom-service-token': serviceToken } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`IA service error ${response.status}: ${message}`);
  }

  return response.json();
}

router.get('/health', async (_req, res) => {
  try {
    const baseUrl = normalizeModelBaseUrl(defaultModelBaseUrl);
    const response = await fetch(`${baseUrl}/health`, {
      headers: serviceToken ? { 'x-uroom-service-token': serviceToken } : {}
    });

    if (!response.ok) {
      const message = await response.text();
      return res.status(502).json({ error: `Unable to reach IA service: ${message}` });
    }

    const health = await response.json();
    return res.json({
      service: 'urroom-api',
      iaModelUrl: baseUrl,
      ia: health
    });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

router.post('/predict', async (req, res) => {
  try {
    const result = await callModel('/predict', req.body);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

router.post('/predict/batch', async (req, res) => {
  try {
    const result = await callModel('/predict/batch', req.body);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

router.post('/compare/team', async (req, res) => {
  try {
    const result = await callModel('/compare/team', req.body);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

router.post('/players/:playerId/similar-pros', async (req, res) => {
  try {
    const topK = Number(req.query?.top_k || req.body?.top_k || 5);

    const player = await prisma.playerProfile.findUnique({
      where: { id: req.params.playerId },
      include: {
        assessments: {
          include: { metrics: true },
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const snapshots = buildPlayerSnapshots(player);
    if (!snapshots.length) {
      return res.status(400).json({
        error: 'No assessments found for this player. Add assessments/metrics before running IA similarity.'
      });
    }

    const result = await callModel(`/player/similar-pros?top_k=${Math.max(1, Math.min(10, topK))}`, {
      snapshots
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/players/:playerId/predict', async (req, res) => {
  try {
    const yearsAhead = Number(req.body?.yearsAhead || 4);

    const player = await prisma.playerProfile.findUnique({
      where: { id: req.params.playerId },
      include: {
        assessments: {
          include: { metrics: true },
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (!player.assessments.length) {
      return res.status(400).json({
        error: 'No assessments found for this player. Add assessments/metrics before running IA prediction.'
      });
    }

    const snapshots = buildPlayerSnapshots(player);

    const result = await callModel('/predict', {
      snapshots,
      years_ahead: yearsAhead
    });

    await prisma.potentialIndex.upsert({
      where: { playerId: player.id },
      update: {
        score: Number(result.potential_score || 0),
        confidence: result.score_reliability === 'high' ? 0.85 : result.score_reliability === 'medium' ? 0.65 : 0.45,
        trajectory:
          Number(result.potential_score || 0) >= 65
            ? 'RISING'
            : Number(result.potential_score || 0) >= 50
              ? 'STABLE_HIGH'
              : Number(result.potential_score || 0) >= 35
                ? 'STABLE_MID'
                : 'INSUFFICIENT',
        factors: {
          radar: result.radar,
          verdict: result.verdict,
          scout_alert: result.scout_alert,
          projections: result.projections
        },
        lastUpdated: new Date()
      },
      create: {
        playerId: player.id,
        score: Number(result.potential_score || 0),
        confidence: result.score_reliability === 'high' ? 0.85 : result.score_reliability === 'medium' ? 0.65 : 0.45,
        trajectory:
          Number(result.potential_score || 0) >= 65
            ? 'RISING'
            : Number(result.potential_score || 0) >= 50
              ? 'STABLE_HIGH'
              : Number(result.potential_score || 0) >= 35
                ? 'STABLE_MID'
                : 'INSUFFICIENT',
        factors: {
          radar: result.radar,
          verdict: result.verdict,
          scout_alert: result.scout_alert,
          projections: result.projections
        },
        lastUpdated: new Date()
      }
    });

    await prisma.playerProfile.update({
      where: { id: player.id },
      data: {
        uroomScore: Number(result.potential_score || 0)
      }
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
