import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import { colors, spacing, typography } from '../theme';

export default function LoadingScreen() {
  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.logoShell}>
          <Image
            source={require('../../assets/icon_uroomAnalytics.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Uroom Sports Analytics</Text>
        <Text style={styles.subtitle}>Initialisation de votre espace scout...</Text>
        <ActivityIndicator color={colors.secondary} size="small" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl
  },
  logoShell: {
    width: 98,
    height: 98,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    marginBottom: spacing.sm
  },
  logo: {
    width: 72,
    height: 72
  },
  title: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center'
  },
  subtitle: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    marginBottom: spacing.xs
  }
});
