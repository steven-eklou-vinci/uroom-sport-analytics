import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import Screen from '../components/Screen';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing, typography } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      console.warn('Login failed', err);
      const message = err instanceof Error ? err.message : 'Invalid credentials or server unavailable.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <BrandLogo variant="full" />
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Use the same account as the web app.</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@uroom.com"
            placeholderTextColor={colors.gray[400]}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            placeholder="Your password"
            placeholderTextColor={colors.gray[400]}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    transform: [{ translateY: -24 }]
  },
  title: {
    color: colors.light,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold
  },
  subtitle: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md
  },
  fieldGroup: {
    width: '100%'
  },
  label: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    marginBottom: spacing.xs
  },
  input: {
    backgroundColor: colors.dark,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.light,
    borderWidth: 1,
    borderColor: colors.gray[600]
  },
  error: {
    color: '#F87171',
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    width: '100%',
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold
  }
});
