import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type MetricPillProps = {
  label: string;
  value: string;
};

export default function MetricPill({ label, value }: MetricPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.gray[700]
  },
  label: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs
  },
  value: {
    color: colors.light,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold
  }
});
