import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  const isValid = await compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  // Générer un JWT simple (pour usage mobile ou tests)
  const token = sign(
    { id: user.id, email: user.email, role: user.role, locale: user.locale },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: '7d' }
  );
  return res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, locale: user.locale } });
}
