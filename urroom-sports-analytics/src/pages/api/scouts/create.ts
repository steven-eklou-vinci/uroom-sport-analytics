import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  // Seuls les CLUB et ADMIN peuvent créer des scouts
  if (!session || !['ADMIN', 'CLUB'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Récupérer le club du user connecté (si CLUB)
    let clubId = null;
    if (session.user.role === 'CLUB') {
      // Trouver le club associé à cet utilisateur
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { clubId: true }
      });

      clubId = user?.clubId;
      
      if (!clubId) {
        return res.status(400).json({ error: 'Aucun club associé à votre compte' });
      }
    }

    // Si ADMIN, le clubId doit être fourni dans le body
    if (session.user.role === 'ADMIN' && req.body.clubId) {
      clubId = req.body.clubId;
    }

    // Hash du mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer le scout
    const newScout = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'SCOUT',
        clubId, // Rattaché au club
        locale: 'fr'
      }
    });

    return res.status(201).json({
      id: newScout.id,
      name: newScout.name,
      email: newScout.email,
      role: newScout.role,
      clubId: newScout.clubId,
      createdAt: newScout.createdAt
    });

  } catch (error) {
    console.error('Erreur création scout:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la création du scout' });
  }
}
