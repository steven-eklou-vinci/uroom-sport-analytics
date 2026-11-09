import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

import Screen from '../../components/Screen';
import PlayerHeader from '../../components/PlayerHeader';
import TrendLineChart from '../../components/TrendLineChart';
import usePlayerProfile from '../../hooks/usePlayerProfile';
import { colors, spacing, typography } from '../../theme';

export default function PlayerProgressScreen() {
  const { profile, loading, error, refresh } = usePlayerProfile();
  const { width } = useWindowDimensions();
  const [selectedMetric, setSelectedMetric] = useState<ChartMetricKey>('technique');
  const clubName = profile?.user?.name || 'Club non defini';
  const timeline = buildTimeline(clubName);
  const chartWidth = Math.max(220, Math.min(width - spacing.lg * 4, 340));
  const selectedOption = useMemo(
    () => chartOptions.find((option) => option.key === selectedMetric) ?? chartOptions[0],
    [selectedMetric]
  );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PlayerHeader title="Progress" subtitle="Track your development" />

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={colors.secondary} />
            <Text style={styles.stateText}>Loading progress...</Text>
          </View>
        ) : (
          <>
            {error ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={refresh} activeOpacity={0.85}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.timelineCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Timeline progression</Text>
              </View>

              <View style={styles.timelineList}>
                {timeline.map((item, index) => (
                  <View key={item.stage} style={styles.timelineItem}>
                    <View style={styles.timelineMarker}>
                      <View style={styles.timelineDot} />
                      {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <Text style={styles.timelineTitle}>{item.stage}</Text>
                        <Text style={styles.timelineClub}>{item.club}</Text>
                      </View>
                      <View style={styles.metricChips}>
                        {item.metrics.map((metric) => (
                          <View key={`${item.stage}-${metric.label}`} style={styles.metricChip}>
                            <Text style={styles.metricChipLabel}>{metric.label}</Text>
                            <Text style={styles.metricChipValue}>{metric.value}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{selectedOption.label} progression</Text>
                <Text style={styles.cardSubtitle}>2024 to 2025</Text>
              </View>

              <View style={styles.metricTabs}>
                {chartOptions.map((option) => {
                  const isActive = option.key === selectedOption.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.metricTab, isActive && styles.metricTabActive]}
                      onPress={() => setSelectedMetric(option.key)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.metricTabText, isActive && styles.metricTabTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TrendLineChart data={selectedOption.series} width={chartWidth} height={150} />
              <View style={styles.chartLegend}>
                {selectedOption.series.map((point) => (
                  <View key={point.label} style={styles.legendItem}>
                    <Text style={styles.legendLabel}>{point.label}</Text>
                    <Text style={styles.legendValue}>{point.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

type TimelineMetric = {
  label: string;
  value: number;
};

type TimelineItem = {
  stage: string;
  club: string;
  metrics: TimelineMetric[];
};

type TrendPoint = {
  label: string;
  value: number;
};

type ChartMetricKey = 'speed' | 'technique' | 'decision' | 'match';

type ChartOption = {
  key: ChartMetricKey;
  label: string;
  series: TrendPoint[];
};

const chartOptions: ChartOption[] = [
  {
    key: 'technique',
    label: 'Technique',
    series: [
      { label: '2024', value: 62 },
      { label: '2025', value: 71 }
    ]
  },
  {
    key: 'speed',
    label: 'Vitesse',
    series: [
      { label: '2024', value: 60 },
      { label: '2025', value: 68 }
    ]
  },
  {
    key: 'decision',
    label: 'Decision',
    series: [
      { label: '2024', value: 58 },
      { label: '2025', value: 66 }
    ]
  },
  {
    key: 'match',
    label: 'Match',
    series: [
      { label: '2024', value: 64 },
      { label: '2025', value: 73 }
    ]
  }
];

function buildTimeline(clubName: string): TimelineItem[] {
  const template = [
    { stage: 'U12', speed: 58, technique: 60, decision: 54, match: 60 },
    { stage: 'U13', speed: 62, technique: 63, decision: 58, match: 64 },
    { stage: 'U14', speed: 66, technique: 67, decision: 62, match: 68 },
    { stage: 'U15', speed: 70, technique: 70, decision: 66, match: 72 },
    { stage: 'U16', speed: 74, technique: 72, decision: 69, match: 76 }
  ];

  return template.map((item) => ({
    stage: item.stage,
    club: clubName,
    metrics: [
      { label: 'Vitesse', value: item.speed },
      { label: 'Technique', value: item.technique },
      { label: 'Decision', value: item.decision },
      { label: 'Match', value: item.match }
    ]
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
  notice: {
    backgroundColor: colors.gray[700],
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[600],
    marginTop: spacing.md
  },
  noticeText: {
    color: colors.gray[200],
    fontSize: typography.sizes.sm
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: 10,
    alignSelf: 'flex-start'
  },
  retryText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  },
  timelineCard: {
    backgroundColor: colors.dark,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[600],
    marginTop: spacing.md
  },
  chartCard: {
    backgroundColor: colors.dark,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[600],
    marginTop: spacing.lg,
    alignItems: 'center'
  },
  cardHeader: {
    width: '100%',
    gap: spacing.xs,
    marginBottom: spacing.md
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
  metricTabs: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  metricTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.gray[600],
    backgroundColor: colors.gray[700]
  },
  metricTabActive: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(20, 184, 166, 0.18)'
  },
  metricTabText: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs
  },
  metricTabTextActive: {
    color: colors.secondary,
    fontFamily: typography.fontFamily.bold
  },
  timelineList: {
    marginTop: spacing.lg,
    gap: spacing.lg
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md
  },
  timelineMarker: {
    width: 16,
    alignItems: 'center'
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray[600],
    marginTop: spacing.xs
  },
  timelineContent: {
    flex: 1,
    gap: spacing.sm
  },
  timelineHeader: {
    gap: spacing.xs
  },
  timelineTitle: {
    color: colors.light,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold
  },
  timelineClub: {
    color: colors.gray[400],
    fontSize: typography.sizes.xs
  },
  metricChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.gray[700]
  },
  metricChipLabel: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs
  },
  metricChipValue: {
    color: colors.light,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold
  },
  chartLegend: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.lg
  },
  legendItem: {
    alignItems: 'center'
  },
  legendLabel: {
    color: colors.gray[400],
    fontSize: typography.sizes.xs
  },
  legendValue: {
    color: colors.light,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  }
});
