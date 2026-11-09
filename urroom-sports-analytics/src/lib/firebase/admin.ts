import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function buildServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function initFirebaseAdmin(): App {
  if (getApps().length) {
    return getApp();
  }

  const serviceAccount = buildServiceAccount();
  if (!serviceAccount) {
    throw new Error('Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.');
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function getFirebaseAdminAuth() {
  const adminApp = initFirebaseAdmin();
  return getAuth(adminApp);
}
