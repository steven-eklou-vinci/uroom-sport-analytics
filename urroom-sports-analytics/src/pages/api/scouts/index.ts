import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  // Seuls les CLUB et ADMIN peuvent voir les scouts
  if (!session || !['ADMIN', 'CLUB'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      let clubId = null;

      // Si CLUB, récupérer ses scouts uniquement
      if (session.user.role === 'CLUB') {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { clubId: true }
        });

        clubId = user?.clubId || null;
      }

      // Si ADMIN, possibilité de filtrer par clubId via query
      if (session.user.role === 'ADMIN' && req.query.clubId) {
        clubId = req.query.clubId as string;
      }

      // Récupérer les scouts
      const scouts = await prisma.user.findMany({
        where: {
          role: 'SCOUT',
          ...(clubId && { clubId })
        },
        include: {
          managedClub: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              reports: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const formattedScouts = scouts.map(scout => ({
        id: scout.id,
        name: scout.name,
        email: scout.email,
        clubId: scout.clubId,
        clubName: scout.managedClub?.name || null,
        reportsCount: scout._count.reports,
        createdAt: scout.createdAt
      }));

      return res.status(200).json(formattedScouts);

    } catch (error) {
      console.error('Erreur récupération scouts:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { scoutId } = req.body;

      if (!scoutId) {
        return res.status(400).json({ error: 'scoutId requis' });
      }

      // Vérifier que le scout appartient au club (si role CLUB)
      if (session.user.role === 'CLUB') {
        const userWithClubs = await prisma.user.findUnique({
          where: { id: session.user.id },
          include: { ownedClubs: true }
        });

        const clubId = userWithClubs?.ownedClubs?.[0]?.id;

        const scout = await prisma.user.findUnique({
          where: { id: scoutId }
        });

        if (scout?.clubId !== clubId) {
          return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos scouts' });
        }
      }

      // Supprimer le scout (ou juste désactiver en mettant clubId à null)
      await prisma.user.update({
        where: { id: scoutId },
        data: { clubId: null } // Désactiver plutôt que supprimer
      });

      return res.status(200).json({ message: 'Scout désactivé avec succès' });

    } catch (error) {
      console.error('Erreur suppression scout:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
