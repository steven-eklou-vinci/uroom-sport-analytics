import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { getFirebaseAdminAuth } from '../../../lib/firebase/admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { email, password, name, locale, idToken, role } = req.body;

  // Preferred path: Firebase Auth token, then create/upsert Prisma user profile.
  if (idToken) {
    try {
      const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
      if (!decoded.email) {
        return res.status(400).json({ error: 'Email manquant dans le token Firebase' });
      }

      const safeRole = role && ['ADMIN', 'SCOUT', 'CLUB', 'AGENT', 'PLAYER'].includes(role) ? role : 'PLAYER';
      const user = await prisma.user.upsert({
        where: { email: decoded.email },
        update: {
          name: name || decoded.name || decoded.email.split('@')[0],
          locale: locale || 'fr',
          oauthProvider: 'firebase',
          oauthId: decoded.uid,
        },
        create: {
          email: decoded.email,
          name: name || decoded.name || decoded.email.split('@')[0],
          locale: locale || 'fr',
          role: safeRole,
          oauthProvider: 'firebase',
          oauthId: decoded.uid,
        },
      });

      return res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (error) {
      console.error('Firebase token verification failed:', error);
      return res.status(401).json({ error: 'Token Firebase invalide' });
    }
  }

  // Legacy fallback for old web registration flow.
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email déjà utilisé' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      locale: locale || 'fr',
      role: 'PLAYER',
    },
  });
  return res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
}
