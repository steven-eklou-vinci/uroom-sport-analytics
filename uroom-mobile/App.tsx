import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import PlayerNavigator from './src/navigation/PlayerNavigator';
import LoadingScreen from './src/screens/LoadingScreen';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { initDatabase } from './src/storage/db';
import AIAgentWidget from './src/components/AIAgentWidget';

function AppContent() {
  const { status, session } = useAuth();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (status !== 'authenticated') {
    return <LoginScreen />;
  }

  const role = session?.user?.role?.toLowerCase() ?? '';
  const locale = session?.user?.locale ?? 'fr';
  const isPlayer = role.includes('player') || role.includes('athlete');

  return (
    <View style={styles.appShell}>
      {isPlayer ? <PlayerNavigator /> : <RootNavigator />}
      <AIAgentWidget role={role} locale={locale} />
    </View>
  );
}

export default function App() {
  useEffect(() => {
    void initDatabase().catch((error) => {
      console.warn('Failed to initialize local database.', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  appShell: {
    flex: 1
  }
});
