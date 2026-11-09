import { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients, spacing } from '../theme';

type ScreenProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export default function Screen({ children, style }: ScreenProps) {
  return (
    <LinearGradient colors={gradients.background} style={[styles.container, style]}>
      <SafeAreaView style={styles.safe}>{children}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  }
});
