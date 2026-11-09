import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Screen from '../../components/Screen';
import PlayerHeader from '../../components/PlayerHeader';
import { useAuth } from '../../auth/AuthContext';
import usePlayerProfile from '../../hooks/usePlayerProfile';
import { colors, spacing, typography } from '../../theme';

export default function PlayerProfileScreen() {
  const { profile, loading, error } = usePlayerProfile();
  const { signOut } = useAuth();

  return (
    <Screen>
      <PlayerHeader title="My Profile" subtitle="Personal details" />

      {loading ? (
        <Text style={styles.stateText}>Loading profile...</Text>
      ) : error ? (
        <Text style={styles.stateText}>{error}</Text>
      ) : profile ? (
        <View style={styles.card}>
          <Text style={styles.name}>{profile.firstName} {profile.lastName}</Text>
          <Text style={styles.meta}>Positions: {profile.positions?.join(', ') || 'N/A'}</Text>
          <Text style={styles.meta}>Nationality: {profile.nationality}</Text>
          <Text style={styles.meta}>Foot: {profile.foot || 'N/A'}</Text>
          <Text style={styles.meta}>Height: {profile.heightCm ? `${profile.heightCm} cm` : 'N/A'}</Text>
          <Text style={styles.meta}>Weight: {profile.weightKg ? `${profile.weightKg} kg` : 'N/A'}</Text>
          <Text style={styles.meta}>Visibility: {profile.publicOptIn ? 'Visible' : 'Hidden'}</Text>
        </View>
      ) : (
        <Text style={styles.stateText}>No profile found.</Text>
      )}

      <TouchableOpacity style={styles.signOut} onPress={signOut} activeOpacity={0.85}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateText: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm,
    marginTop: spacing.lg
  },
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
  meta: {
    marginTop: spacing.xs,
    color: colors.gray[300],
    fontSize: typography.sizes.sm
  },
  signOut: {
    marginTop: spacing.lg,
    backgroundColor: colors.gray[700],
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[600]
  },
  signOutText: {
    color: colors.light,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  }
});
