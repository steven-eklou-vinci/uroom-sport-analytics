import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { name, locale, currentPassword, newPassword } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Prepare update data
    const updateData: any = {
      name,
      locale
    };

    // If changing password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Le mot de passe actuel est requis' });
      }

      // Verify current password
      if (user.passwordHash) {
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
          return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.passwordHash = hashedPassword;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        locale: true
      }
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
