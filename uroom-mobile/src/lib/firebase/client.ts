import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

let cachedAuth: ReturnType<typeof getAuth> | null = null;

function readConfigValue(key: string): string | undefined {
  const envValue = (process.env as Record<string, string | undefined>)[key];
  if (envValue) return envValue;

  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return extra?.[key];
}

function buildFirebaseConfig() {
  return {
    apiKey: readConfigValue('EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: readConfigValue('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: readConfigValue('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: readConfigValue('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readConfigValue('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readConfigValue('EXPO_PUBLIC_FIREBASE_APP_ID'),
    measurementId: readConfigValue('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID')
  };
}

export function getFirebaseAuth() {
  if (cachedAuth) return cachedAuth;
  const config = buildFirebaseConfig();

  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new Error('Firebase config missing. Set EXPO_PUBLIC_FIREBASE_* env vars.');
  }

  const app = getApps().length ? getApp() : initializeApp(config);

  try {
    cachedAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch {
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}
