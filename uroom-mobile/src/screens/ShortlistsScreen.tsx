import { StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import SectionHeader from '../components/SectionHeader';
import { colors, spacing, typography } from '../theme';

const shortlists = [
  { id: 's1', title: 'U16 Priority', count: 12 },
  { id: 's2', title: 'Watch Again', count: 7 },
  { id: 's3', title: 'Left Footed', count: 5 }
];

export default function ShortlistsScreen() {
  return (
    <Screen>
      <SectionHeader title="Shortlists" subtitle="Follow-up pipeline" />
      <View style={styles.container}>
        {shortlists.map((list) => (
          <View key={list.id} style={styles.card}>
            <Text style={styles.title}>{list.title}</Text>
            <Text style={styles.count}>{list.count} players</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  card: {
    backgroundColor: colors.dark,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[600]
  },
  title: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold
  },
  count: {
    marginTop: spacing.xs,
    color: colors.gray[300],
    fontSize: typography.sizes.sm
  }
});
