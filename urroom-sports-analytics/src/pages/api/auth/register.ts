import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  const { email, password, name, locale } = req.body;
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
