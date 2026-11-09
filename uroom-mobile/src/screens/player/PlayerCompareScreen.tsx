import { StyleSheet, Text, View } from 'react-native';

import Screen from '../../components/Screen';
import PlayerHeader from '../../components/PlayerHeader';
import { colors, spacing, typography } from '../../theme';

export default function PlayerCompareScreen() {
  return (
    <Screen>
      <PlayerHeader title="Compare" subtitle="Similar profiles" />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Comparison coming soon</Text>
        <Text style={styles.cardText}>
          We will surface comparable pro and league profiles here.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[600]
  },
  cardTitle: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold
  },
  cardText: {
    marginTop: spacing.sm,
    color: colors.gray[300],
    fontSize: typography.sizes.sm
  }
});
