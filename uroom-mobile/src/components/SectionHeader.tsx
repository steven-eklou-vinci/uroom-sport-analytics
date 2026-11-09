import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg
  },
  title: {
    color: colors.light,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.gray[300],
    fontSize: typography.sizes.sm
  }
});
