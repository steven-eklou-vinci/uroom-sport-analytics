import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Screen from '../components/Screen';
import SectionHeader from '../components/SectionHeader';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing, typography } from '../theme';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const user = session?.user;

  return (
    <Screen>
      <SectionHeader title="Profile" subtitle="Account and sync" />
      <BrandLogo variant="mark" />
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name || user?.email || 'Uroom User'}</Text>
        <Text style={styles.role}>Role: {user?.role || 'Unknown'}</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>Sync status</Text>
        <Text style={styles.value}>All drafts synced</Text>
        <Text style={[styles.label, { marginTop: spacing.md }]}>Consent</Text>
        <Text style={styles.value}>2 pending signatures</Text>
        <TouchableOpacity style={styles.signOut} onPress={signOut} activeOpacity={0.85}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
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
  name: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold
  },
  role: {
    marginTop: spacing.xs,
    color: colors.gray[300],
    fontSize: typography.sizes.sm
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[600],
    marginVertical: spacing.md
  },
  label: {
    color: colors.gray[400],
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase'
  },
  value: {
    marginTop: spacing.xs,
    color: colors.light,
    fontSize: typography.sizes.md
  },
  signOut: {
    marginTop: spacing.lg,
    backgroundColor: colors.gray[700],
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center'
  },
  signOutText: {
    color: colors.light,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  }
});
