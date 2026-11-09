import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Uroom2026!';

const SNAPSHOT_SEASONS = [
  { season: '2022-23', snapshotDate: '2023-05-15' },
  { season: '2023-24', snapshotDate: '2024-05-15' },
  { season: '2024-25', snapshotDate: '2025-05-15' }
];

const AGE_RANGES = {
  height: {
    11: [143, 150],
    12: [149, 157],
    13: [156, 165],
    14: [163, 171],
    15: [169, 175],
    16: [172, 178],
    17: [174, 180]
  },
  sprint30: {
    11: [4.7, 5.1],
    12: [4.5, 4.9],
    13: [4.4, 4.8],
    14: [4.3, 4.7],
    15: [4.2, 4.6],
    16: [4.1, 4.5],
    17: [4.05, 4.45]
  },
  jump: {
    11: [24, 35],
    12: [27, 38],
    13: [30, 42],
    14: [34, 46],
    15: [38, 50],
    16: [41, 53],
    17: [43, 55]
  },
  endurance: {
    11: [40, 53],
    12: [43, 56],
    13: [45, 58],
    14: [48, 61],
    15: [51, 63],
    16: [53, 65],
    17: [55, 67]
  },
  passAccuracy: {
    11: [50, 68],
    12: [53, 72],
    13: [56, 75],
    14: [59, 78],
    15: [62, 80],
    16: [65, 83],
    17: [67, 85]
  }
};

const PLAYER_SPECS = [
  { firstName: 'Noah', lastName: 'Van Damme', birthDate: '2011-02-18', position: 'GK', dominantFoot: 'right', nationality: 'BE', quality: 'medium', competitionLevel: 3 },
  { firstName: 'Yassine', lastName: 'El Idrissi', birthDate: '2010-09-07', position: 'GK', dominantFoot: 'left', nationality: 'MA', quality: 'high', competitionLevel: 2 },
  { firstName: 'Matteo', lastName: 'Dupont', birthDate: '2009-11-03', position: 'DEF', dominantFoot: 'right', nationality: 'FR', quality: 'medium', competitionLevel: 3 },
  { firstName: 'Ilias', lastName: 'Boukhriss', birthDate: '2009-04-14', position: 'DEF', dominantFoot: 'right', nationality: 'BE', quality: 'low', competitionLevel: 4 },
  { firstName: 'Ruben', lastName: 'De Smet', birthDate: '2008-12-01', position: 'DEF', dominantFoot: 'left', nationality: 'NL', quality: 'high', competitionLevel: 2 },
  { firstName: 'Adam', lastName: 'Mbenza', birthDate: '2010-01-24', position: 'MID', dominantFoot: 'right', nationality: 'CD', quality: 'medium', competitionLevel: 3 },
  { firstName: 'Luca', lastName: 'Peeters', birthDate: '2009-07-12', position: 'MID', dominantFoot: 'both', nationality: 'BE', quality: 'high', competitionLevel: 2 },
  { firstName: 'Nassim', lastName: 'Benjelloun', birthDate: '2008-06-29', position: 'MID', dominantFoot: 'left', nationality: 'MA', quality: 'low', competitionLevel: 4 },
  { firstName: 'Sami', lastName: 'Leroy', birthDate: '2008-03-10', position: 'FWD', dominantFoot: 'right', nationality: 'FR', quality: 'high', competitionLevel: 2 },
  { firstName: 'Younes', lastName: 'Haddad', birthDate: '2007-10-21', position: 'FWD', dominantFoot: 'right', nationality: 'BE', quality: 'medium', competitionLevel: 3 }
];

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashCode(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randBetween(rng, min, max, decimals = 2) {
  const v = min + rng() * (max - min);
  return Number(v.toFixed(decimals));
}

function dateFromIso(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function calcAgeDecimal(birthDateIso, snapshotDateIso) {
  const birth = dateFromIso(birthDateIso).getTime();
  const snap = dateFromIso(snapshotDateIso).getTime();
  return Number(((snap - birth) / (365.25 * 24 * 3600 * 1000)).toFixed(1));
}

function ageBand(ageDecimal) {
  return clamp(Math.round(ageDecimal), 11, 17);
}

function getRange(map, ageDecimal) {
  return map[ageBand(ageDecimal)] || map[17];
}

function qualityOffset(quality, category) {
  const table = {
    high: {
      tech: 0.78,
      phys: 0.68,
      sprint: 0.22,
      scout: 0.84
    },
    medium: {
      tech: 0.52,
      phys: 0.5,
      sprint: 0.5,
      scout: 0.56
    },
    low: {
      tech: 0.24,
      phys: 0.36,
      sprint: 0.72,
      scout: 0.34
    }
  };
  return table[quality]?.[category] ?? 0.5;
}

function basePositionMetrics(position) {
  if (position === 'GK') {
    return {
      goals90: [0.0, 0.05],
      assists90: [0.0, 0.08],
      interceptions90: [0.5, 2.2],
      dribble: [42, 55],
      shots: [20, 35],
      duels: [38, 60]
    };
  }
  if (position === 'DEF') {
    return {
      goals90: [0.0, 0.2],
      assists90: [0.0, 0.2],
      interceptions90: [1.8, 4.5],
      dribble: [42, 62],
      shots: [20, 42],
      duels: [40, 62]
    };
  }
  if (position === 'MID') {
    return {
      goals90: [0.0, 0.35],
      assists90: [0.05, 0.45],
      interceptions90: [1.0, 3.8],
      dribble: [45, 68],
      shots: [24, 48],
      duels: [36, 60]
    };
  }
  return {
    goals90: [0.15, 0.8],
    assists90: [0.05, 0.6],
    interceptions90: [0.5, 2.4],
    dribble: [50, 70],
    shots: [28, 55],
    duels: [32, 56]
  };
}

function techProgressFactor(rng) {
  return Number((1.02 + rng() * 0.06).toFixed(4));
}

function buildInitialSnapshot(spec, rng, seasonInfo, index) {
  const age = calcAgeDecimal(spec.birthDate, seasonInfo.snapshotDate);

  const [hMin, hMax] = getRange(AGE_RANGES.height, age);
  const [s30Min, s30Max] = getRange(AGE_RANGES.sprint30, age);
  const [jumpMin, jumpMax] = getRange(AGE_RANGES.jump, age);
  const [endoMin, endoMax] = getRange(AGE_RANGES.endurance, age);
  const [passMin, passMax] = getRange(AGE_RANGES.passAccuracy, age);

  const posBase = basePositionMetrics(spec.position);

  const height = Math.round(hMin + qualityOffset(spec.quality, 'phys') * (hMax - hMin));
  const weight = Math.round(height * 0.37 + age * 0.5 + randBetween(rng, -1.5, 1.5, 2));
  const sitting = Math.round(height * 0.52 + randBetween(rng, -1, 1, 2));

  const sprint30 = Number((s30Min + qualityOffset(spec.quality, 'sprint') * (s30Max - s30Min)).toFixed(2));
  const sprint10 = Number((sprint30 * 0.42 + randBetween(rng, -0.03, 0.03, 3)).toFixed(2));
  const jump = Math.round(jumpMin + qualityOffset(spec.quality, 'phys') * (jumpMax - jumpMin));
  const endurance = Math.round(endoMin + qualityOffset(spec.quality, 'phys') * (endoMax - endoMin));

  const passAccuracy = Number((passMin + qualityOffset(spec.quality, 'tech') * (passMax - passMin)).toFixed(1));
  const duels = Number((32 + (ageBand(age) - 11) * 3 + randBetween(rng, -2.5, 2.5, 2)).toFixed(1));
  const dribble = Number((posBase.dribble[0] + qualityOffset(spec.quality, 'tech') * (posBase.dribble[1] - posBase.dribble[0])).toFixed(1));
  const shots = Number((posBase.shots[0] + qualityOffset(spec.quality, 'tech') * (posBase.shots[1] - posBase.shots[0])).toFixed(1));
  const interceptions = Number((posBase.interceptions90[0] + qualityOffset(spec.quality, 'phys') * (posBase.interceptions90[1] - posBase.interceptions90[0])).toFixed(2));
  const goals90 = Number((posBase.goals90[0] + qualityOffset(spec.quality, 'tech') * (posBase.goals90[1] - posBase.goals90[0])).toFixed(2));
  const assists90 = Number((posBase.assists90[0] + qualityOffset(spec.quality, 'tech') * (posBase.assists90[1] - posBase.assists90[0])).toFixed(2));

  const matches = Math.round(randBetween(rng, 8, 25, 0));
  const minPerMatch = Math.round(randBetween(rng, 55, spec.position === 'GK' ? 90 : 86, 0));
  const minutes = clamp(matches * minPerMatch, matches * 45, matches * 90);

  const avgScout = Number((4 + qualityOffset(spec.quality, 'scout') * 5.5 + (index % 3) * 0.15).toFixed(2));

  return {
    season: seasonInfo.season,
    snapshotDate: seasonInfo.snapshotDate,
    age,
    metrics: {
      competition_level: clamp(spec.competitionLevel + (rng() > 0.85 ? 1 : 0) - (rng() < 0.15 ? 1 : 0), 1, 5),
      height_cm: height,
      weight_kg: weight,
      sitting_height_cm: sitting,
      sprint_10m_sec: sprint10,
      sprint_30m_sec: sprint30,
      jump_cm: jump,
      endurance_score: endurance,
      matches_played: matches,
      minutes_played: minutes,
      pass_accuracy_pct: clamp(passAccuracy, passMin, passMax),
      dribble_success_pct: clamp(dribble, 42, 70),
      shots_on_target_pct: clamp(shots, 20, 55),
      duels_won_pct: clamp(duels, 32, 62),
      interceptions_per90: clamp(interceptions, 0.5, 4.5),
      goals_per90: clamp(goals90, 0, spec.position === 'FWD' ? 0.8 : 0.2),
      assists_per90: clamp(assists90, 0, 0.6),
      avg_scout_score: clamp(avgScout, 4.0, 9.5),
      scout_observation_count: Math.round(randBetween(rng, 0, 3, 0))
    }
  };
}

function evolveSnapshot(spec, previous, seasonInfo, rng) {
  const age = calcAgeDecimal(spec.birthDate, seasonInfo.snapshotDate);
  const [hMin, hMax] = getRange(AGE_RANGES.height, age);
  const [s30Min, s30Max] = getRange(AGE_RANGES.sprint30, age);
  const [jumpMin, jumpMax] = getRange(AGE_RANGES.jump, age);
  const [endoMin, endoMax] = getRange(AGE_RANGES.endurance, age);
  const [passMin, passMax] = getRange(AGE_RANGES.passAccuracy, age);

  const progressPass = techProgressFactor(rng);
  const progressDribble = techProgressFactor(rng);
  const progressShots = techProgressFactor(rng);
  const progressDuels = techProgressFactor(rng);
  const progressInterceptions = techProgressFactor(rng);
  const progressGoals = techProgressFactor(rng);
  const progressAssists = techProgressFactor(rng);

  const grownHeight = previous.metrics.height_cm + Math.round(randBetween(rng, 3, 8, 0));
  const height = clamp(grownHeight, hMin, hMax);

  const sprint30 = clamp(Number((previous.metrics.sprint_30m_sec - randBetween(rng, 0.04, 0.11, 3)).toFixed(2)), s30Min, s30Max);
  const sprint10 = Number((sprint30 * 0.42 + randBetween(rng, -0.02, 0.02, 3)).toFixed(2));

  const matches = clamp(previous.metrics.matches_played + Math.round(randBetween(rng, -2, 3, 0)), 8, 25);
  const minPerMatch = Math.round(randBetween(rng, 58, spec.position === 'GK' ? 90 : 88, 0));
  const minutes = clamp(matches * minPerMatch, matches * 45, matches * 90);

  return {
    season: seasonInfo.season,
    snapshotDate: seasonInfo.snapshotDate,
    age,
    metrics: {
      competition_level: clamp(previous.metrics.competition_level + (rng() > 0.9 ? 1 : 0) - (rng() < 0.12 ? 1 : 0), 1, 5),
      height_cm: Math.round(height),
      weight_kg: Math.round(height * 0.37 + age * 0.5 + randBetween(rng, -1.2, 1.2, 2)),
      sitting_height_cm: Math.round(height * 0.52 + randBetween(rng, -1, 1, 2)),
      sprint_10m_sec: Number(sprint10.toFixed(2)),
      sprint_30m_sec: Number(sprint30.toFixed(2)),
      jump_cm: Math.round(clamp(previous.metrics.jump_cm + randBetween(rng, 1, 4, 2), jumpMin, jumpMax)),
      endurance_score: Math.round(clamp(previous.metrics.endurance_score + randBetween(rng, 1, 4, 2), endoMin, endoMax)),
      matches_played: matches,
      minutes_played: minutes,
      pass_accuracy_pct: Number(clamp(previous.metrics.pass_accuracy_pct * progressPass, passMin, passMax).toFixed(1)),
      dribble_success_pct: Number(clamp(previous.metrics.dribble_success_pct * progressDribble, 42, 70).toFixed(1)),
      shots_on_target_pct: Number(clamp(previous.metrics.shots_on_target_pct * progressShots, 20, 55).toFixed(1)),
      duels_won_pct: Number(clamp(previous.metrics.duels_won_pct * progressDuels, 32, 62).toFixed(1)),
      interceptions_per90: Number(clamp(previous.metrics.interceptions_per90 * progressInterceptions, 0.5, 4.5).toFixed(2)),
      goals_per90: Number(clamp(previous.metrics.goals_per90 * progressGoals, 0, spec.position === 'FWD' ? 0.8 : 0.2).toFixed(2)),
      assists_per90: Number(clamp(previous.metrics.assists_per90 * progressAssists, 0, 0.6).toFixed(2)),
      avg_scout_score: Number(clamp(previous.metrics.avg_scout_score + randBetween(rng, 0.08, 0.35, 2), 4.0, 9.5).toFixed(2)),
      scout_observation_count: clamp(previous.metrics.scout_observation_count + (rng() > 0.55 ? 1 : 0), 0, 3)
    }
  };
}

function buildPlayerSnapshots(spec, index) {
  const rng = makeRng(hashCode(`${spec.firstName}-${spec.lastName}-${index}`));

  const snapshots = [];
  let previous = buildInitialSnapshot(spec, rng, SNAPSHOT_SEASONS[0], index);
  snapshots.push(previous);

  for (let i = 1; i < SNAPSHOT_SEASONS.length; i += 1) {
    previous = evolveSnapshot(spec, previous, SNAPSHOT_SEASONS[i], rng);
    snapshots.push(previous);
  }

  return snapshots;
}

function metricRows(metrics) {
  return [
    { key: 'competition_level', value: metrics.competition_level, unit: 'level' },
    { key: 'height_cm', value: metrics.height_cm, unit: 'cm' },
    { key: 'weight_kg', value: metrics.weight_kg, unit: 'kg' },
    { key: 'sitting_height_cm', value: metrics.sitting_height_cm, unit: 'cm' },
    { key: 'sprint_10m_sec', value: metrics.sprint_10m_sec, unit: 'sec' },
    { key: 'sprint_30m_sec', value: metrics.sprint_30m_sec, unit: 'sec' },
    { key: 'jump_cm', value: metrics.jump_cm, unit: 'cm' },
    { key: 'endurance_score', value: metrics.endurance_score, unit: 'score' },
    { key: 'matches_played', value: metrics.matches_played, unit: 'count' },
    { key: 'minutes_played', value: metrics.minutes_played, unit: 'min' },
    { key: 'pass_accuracy_pct', value: metrics.pass_accuracy_pct, unit: '%' },
    { key: 'dribble_success_pct', value: metrics.dribble_success_pct, unit: '%' },
    { key: 'shots_on_target_pct', value: metrics.shots_on_target_pct, unit: '%' },
    { key: 'duels_won_pct', value: metrics.duels_won_pct, unit: '%' },
    { key: 'interceptions_per90', value: metrics.interceptions_per90, unit: 'per90' },
    { key: 'goals_per90', value: metrics.goals_per90, unit: 'per90' },
    { key: 'assists_per90', value: metrics.assists_per90, unit: 'per90' },
    { key: 'avg_scout_score', value: metrics.avg_scout_score, unit: '/10' },
    { key: 'scout_observation_count', value: metrics.scout_observation_count, unit: 'count' }
  ];
}

async function upsertUser({ email, name, role, locale = 'fr' }, passwordHash) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role, locale, passwordHash },
    create: { email, name, role, locale, passwordHash }
  });
}

async function cleanupCurrentPlayers() {
  await prisma.playerComparison.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.metric.deleteMany({});
  await prisma.assessment.deleteMany({});
  await prisma.playerFollow.deleteMany({});
  await prisma.shortlistPlayer.deleteMany({});
  await prisma.trialRequest.deleteMany({});
  await prisma.bioBanding.deleteMany({});
  await prisma.potentialIndex.deleteMany({});
  await prisma.playerProfile.deleteMany({});
  await prisma.user.deleteMany({ where: { role: 'PLAYER' } });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await cleanupCurrentPlayers();

  const admin = await upsertUser(
    { email: 'admin@uroom.app', name: 'Admin Uroom', role: 'ADMIN' },
    passwordHash
  );
  const scout = await upsertUser(
    { email: 'scout.lina@uroom.app', name: 'Lina Scout', role: 'SCOUT' },
    passwordHash
  );
  const clubManager = await upsertUser(
    { email: 'club.rcn@uroom.app', name: 'RC Nord Recrutement', role: 'CLUB' },
    passwordHash
  );

  const club = await prisma.club.upsert({
    where: { id: 'club-rc-nord' },
    update: {
      name: 'RC Nord Academy',
      country: 'BE',
      tier: 'Youth Elite',
      contactEmail: 'club.rcn@uroom.app',
      subscriptionTier: 'PRO'
    },
    create: {
      id: 'club-rc-nord',
      name: 'RC Nord Academy',
      country: 'BE',
      tier: 'Youth Elite',
      contactEmail: 'club.rcn@uroom.app',
      subscriptionTier: 'PRO'
    }
  });

  await prisma.user.update({ where: { id: scout.id }, data: { clubId: club.id } });
  await prisma.user.update({ where: { id: clubManager.id }, data: { clubId: club.id } });

  const loginAccounts = [
    { email: admin.email, role: 'ADMIN', name: admin.name },
    { email: scout.email, role: 'SCOUT', name: scout.name },
    { email: clubManager.email, role: 'CLUB', name: clubManager.name }
  ];

  for (let i = 0; i < PLAYER_SPECS.length; i += 1) {
    const spec = PLAYER_SPECS[i];
    const snapshots = buildPlayerSnapshots(spec, i);
    const latest = snapshots[snapshots.length - 1];

    const email = `${spec.firstName.toLowerCase()}.${spec.lastName.toLowerCase().replace(/\s+/g, '')}@uroom.app`;
    const playerUser = await upsertUser(
      {
        email,
        name: `${spec.firstName} ${spec.lastName}`,
        role: 'PLAYER'
      },
      passwordHash
    );

    loginAccounts.push({ email, role: 'PLAYER', name: playerUser.name });

    const profile = await prisma.playerProfile.create({
      data: {
        firstName: spec.firstName,
        lastName: spec.lastName,
        birthDate: dateFromIso(spec.birthDate),
        age: Math.floor(latest.age),
        nationality: spec.nationality,
        foot: spec.dominantFoot,
        heightCm: Math.round(latest.metrics.height_cm),
        weightKg: Math.round(latest.metrics.weight_kg),
        positions: [spec.position],
        userId: playerUser.id,
        createdByScoutId: scout.id,
        dataSource: 'PLATFORM_DATA',
        tags: ['youth', 'academy', `U${Math.floor(latest.age)}`],
        publicOptIn: true,
        videoUrls: [],
        uroomScore: Number((latest.metrics.avg_scout_score * 10).toFixed(1)),
        uroomRank: i + 1
      }
    });

    for (const snap of snapshots) {
      const assessment = await prisma.assessment.create({
        data: {
          playerId: profile.id,
          scoutId: scout.id,
          date: dateFromIso(snap.snapshotDate),
          location: 'Uroom Performance Center',
          status: 'DONE',
          notes: `Snapshot ${snap.season} | age=${snap.age}`,
          videos: []
        }
      });

      await prisma.metric.createMany({
        data: metricRows(snap.metrics).map((m) => ({
          assessmentId: assessment.id,
          key: m.key,
          value: m.value,
          unit: m.unit
        }))
      });
    }

    const maturityOffset = Number((latest.age < 14 ? -0.2 : latest.age > 15.5 ? 0.5 : 0.1).toFixed(2));
    const biologicalAge = Number((latest.age + maturityOffset).toFixed(2));

    await prisma.bioBanding.create({
      data: {
        playerId: profile.id,
        chronologicalAge: Number(latest.age.toFixed(2)),
        biologicalAge,
        maturityOffset,
        category: maturityOffset > 0.35 ? 'EARLY_MATURE' : maturityOffset < -0.1 ? 'LATE_MATURE' : 'AVERAGE'
      }
    });

    await prisma.potentialIndex.create({
      data: {
        playerId: profile.id,
        score: Number((latest.metrics.avg_scout_score * 10).toFixed(1)),
        confidence: 0.72,
        trajectory: latest.metrics.avg_scout_score >= 7.8 ? 'RISING' : latest.metrics.avg_scout_score >= 6.3 ? 'STABLE_HIGH' : 'STABLE_MID',
        factors: {
          source: 'seed_realistic_youth',
          seasons: snapshots.map((s) => s.season),
          lastSeason: latest.season,
          competitionLevel: latest.metrics.competition_level,
          age: latest.age
        }
      }
    });
  }

  console.log('Seed complete. Login accounts created:');
  loginAccounts.forEach((a) => {
    console.log(`- ${a.role}: ${a.email} (${a.name})`);
  });
  console.log(`Shared password: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
