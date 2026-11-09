import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import Screen from '../../components/Screen';
import PlayerHeader from '../../components/PlayerHeader';
import RadarChart from '../../components/RadarChart';
import usePlayerProfile from '../../hooks/usePlayerProfile';
import { colors, spacing, typography } from '../../theme';

export default function PlayerHomeScreen() {
  const { profile, loading, error, refresh } = usePlayerProfile();

  const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Uroom Player';
  const age = computeAge(profile?.birthDate);
  const category = getCategory(age);
  const club = 'Club non defini';
  const positions = profile?.positions ?? [];
  const primaryPosition = positions[0] ?? 'N/A';
  const secondaryPositions = positions.slice(1);
  const height = profile?.heightCm ? `${profile.heightCm} cm` : '--';
  const weight = profile?.weightKg ? `${profile.weightKg} kg` : '--';
  const foot = profile?.foot ?? 'N/A';

  const metrics = buildMetrics(profile?.assessments ?? []);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PlayerHeader title="Home" subtitle="Your development overview" />

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={colors.secondary} />
            <Text style={styles.stateText}>Loading profile...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{error}</Text>
            <Text style={styles.stateHint} onPress={refresh}>
              Tap to retry
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.profileTop}>
                <View>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.meta}>
                    {age ? `${age}y` : '--'} • {category}
                  </Text>
                  <Text style={styles.club}>{club}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{category}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Poste principal</Text>
                  <Text style={styles.detailValue}>{primaryPosition}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Pied fort</Text>
                  <Text style={styles.detailValue}>{foot}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Taille</Text>
                  <Text style={styles.detailValue}>{height}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Poids</Text>
                  <Text style={styles.detailValue}>{weight}</Text>
                </View>
              </View>

              <View style={styles.positionsBlock}>
                <Text style={styles.detailLabel}>Postes secondaires</Text>
                <View style={styles.tagRow}>
                  {secondaryPositions.length > 0 ? (
                    secondaryPositions.map((position) => (
                      <View key={position} style={styles.tag}>
                        <Text style={styles.tagText}>{position}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.tagMuted}>
                      <Text style={styles.tagMutedText}>Aucun</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.metricsCard}>
              <View style={styles.metricsHeader}>
                <Text style={styles.cardTitle}>Development metrics</Text>
                <Text style={styles.cardSubtitle}>Radar + scores</Text>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.radarWrap}>
                  <RadarChart metrics={metrics} size={190} />
                </View>
                <View style={styles.metricsList}>
                  {metrics.map((metric) => (
                    <View key={metric.label} style={styles.metricItem}>
                      <View style={styles.metricTop}>
                        <Text style={styles.metricLabel}>{metric.label}</Text>
                        <Text style={styles.metricValue}>{Math.round(metric.value)}</Text>
                      </View>
                      <View style={styles.metricBar}>
                        <View style={[styles.metricFill, { width: `${metric.value}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

type ApiMetric = {
  key: string;
  value: number;
};

type ApiAssessment = {
  date: string;
  metrics?: ApiMetric[];
};

type RadarMetric = {
  label: string;
  value: number;
};

const metricDefinitions = [
  { key: 'speed', label: 'Vitesse', fallback: 74 },
  { key: 'agility', label: 'Agilite', fallback: 69 },
  { key: 'technique', label: 'Technique', fallback: 72 },
  { key: 'vision', label: 'Vision', fallback: 65 },
  { key: 'mental', label: 'Mental', fallback: 68 },
  { key: 'physical', label: 'Physique', fallback: 70 }
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeAge(birthDate?: string | null): number {
  if (!birthDate) return 0;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = Date.now() - date.getTime();
  return Math.max(0, new Date(diff).getUTCFullYear() - 1970);
}

function getCategory(age: number): string {
  if (!age) return 'U--';
  const clamped = clamp(age, 11, 18);
  return `U${clamped}`;
}

function normalizeMetricKey(value: string): string {
  const key = value.toLowerCase().replace(/[^a-z]/g, '');
  const aliases: Record<string, string> = {
    vitesse: 'speed',
    speed: 'speed',
    agilite: 'agility',
    agility: 'agility',
    technique: 'technique',
    vision: 'vision',
    mental: 'mental',
    physique: 'physical',
    physical: 'physical'
  };
  return aliases[key] ?? key;
}

function normalizeMetricValue(value?: number | null): number | null {
  if (value === null || value === undefined) return null;
  const scaled = value <= 10 ? value * 10 : value;
  return clamp(scaled, 0, 100);
}

function buildMetrics(assessments: ApiAssessment[]): RadarMetric[] {
  const latest = assessments
    ? [...assessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : undefined;
  const metricMap = new Map<string, number>();

  latest?.metrics?.forEach((metric) => {
    const key = normalizeMetricKey(metric.key);
    const value = normalizeMetricValue(metric.value);
    if (value !== null) {
      metricMap.set(key, value);
    }
  });

  return metricDefinitions.map((definition) => ({
    label: definition.label,
    value: metricMap.get(definition.key) ?? definition.fallback
  }));
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl
  },
  stateContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm
  },
  stateText: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm
  },
  stateHint: {
    color: colors.secondary,
    fontSize: typography.sizes.sm
  },
  profileCard: {
    backgroundColor: colors.dark,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[600],
    gap: spacing.lg
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  name: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold
  },
  meta: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs
  },
  club: {
    color: colors.gray[400],
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs
  },
  badge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999
  },
  badgeText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  detailItem: {
    minWidth: 110
  },
  detailLabel: {
    color: colors.gray[400],
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase'
  },
  detailValue: {
    color: colors.light,
    fontSize: typography.sizes.md,
    marginTop: spacing.xs
  },
  positionsBlock: {
    gap: spacing.sm
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 184, 166, 0.15)'
  },
  tagText: {
    color: colors.secondary,
    fontSize: typography.sizes.xs
  },
  tagMuted: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.gray[700]
  },
  tagMutedText: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs
  },
  metricsCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.dark,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[600],
    gap: spacing.lg
  },
  metricsHeader: {
    gap: spacing.xs
  },
  cardTitle: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold
  },
  cardSubtitle: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg
  },
  radarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexBasis: 200
  },
  metricsList: {
    flex: 1,
    minWidth: 170,
    gap: spacing.md
  },
  metricItem: {
    gap: spacing.xs
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricLabel: {
    color: colors.gray[200],
    fontSize: typography.sizes.sm
  },
  metricValue: {
    color: colors.light,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  },
  metricBar: {
    height: 6,
    backgroundColor: colors.gray[700],
    borderRadius: 999,
    overflow: 'hidden'
  },
  metricFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 999
  }
});
