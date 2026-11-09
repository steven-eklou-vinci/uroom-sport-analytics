import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Player } from '../types';
import { colors, spacing, typography } from '../theme';
import MetricPill from './MetricPill';
import { PlayerDataBadge } from './PlayerDataBadge';

type PlayerCardProps = {
  player: Player;
  onPress?: () => void;
};

export default function PlayerCard({ player, onPress }: PlayerCardProps) {
  const hasDataSource = player.dataSource && player.dataSource !== 'PLATFORM_DATA';
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {hasDataSource && (
        <View style={styles.badge}>
          <PlayerDataBadge
            dataSource={player.dataSource!}
            createdByScout={player.createdByScout}
            compact
          />
        </View>
      )}
      
      <View style={styles.header}>
        <View style={styles.identity}>
          {player.photoUrl ? (
            <Image source={{ uri: player.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{player.name.charAt(0)}</Text>
            </View>
          )}
          <View>
            <Text style={styles.name}>{player.name}</Text>
            <Text style={styles.meta}>
              {player.position} • {player.age}y • {player.nationality}
            </Text>
            <Text style={styles.club}>{player.club}</Text>
          </View>
        </View>
        <View style={styles.score}>
          <Text style={styles.scoreValue}>{player.uroomScore}</Text>
          <Text style={styles.scoreLabel}>Potential</Text>
          <TouchableOpacity style={styles.viewBtn} activeOpacity={0.8} onPress={onPress}>
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {player.metrics && player.metrics.length > 0 && (
        <View style={styles.metrics}>
          {player.metrics.map((metric) => (
            <MetricPill key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </View>
      )}

      {player.dataSource === 'SCOUT_CREATED' && (
        <View style={styles.noMetricsInfo}>
          <Text style={styles.noMetricsText}>
            ⓘ Profil créé par scout - Métriques non disponibles
          </Text>
        </View>
      )}

      <View style={styles.tags}>
        {player.tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[600]
  },
  badge: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gray[600]
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray[700],
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.gray[200],
    fontFamily: typography.fontFamily.bold
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
  score: {
    alignItems: 'center'
  },
  scoreValue: {
    color: colors.secondary,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold
  },
  scoreLabel: {
    color: colors.gray[400],
    fontSize: typography.sizes.xs
  },
  viewBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.secondary
  },
  viewBtnText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md
  },
  noMetricsInfo: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  noMetricsText: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md
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
  }
});
