import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    // Récupérer le profil joueur de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        players: true,
      },
    });

    if (!user || !user.players || user.players.length === 0) {
      return res.status(404).json({ error: 'Profil joueur non trouvé' });
    }

    const playerProfile = user.players[0];

    if (req.method === 'GET') {
      // Retourner les vidéos
      return res.status(200).json({
        videos: playerProfile.videoUrls || [],
      });
    }

    if (req.method === 'POST') {
      // Mettre à jour les vidéos
      const { videoUrls } = req.body;

      if (!Array.isArray(videoUrls)) {
        return res.status(400).json({ error: 'videoUrls doit être un tableau' });
      }

      console.log('📥 Réception de videoUrls:', videoUrls);

      // Valider les URLs (accepter les URLs complètes et les chemins relatifs)
      const validUrls = videoUrls.filter(url => {
        if (!url || typeof url !== 'string') return false;
        
        // Accepter les chemins relatifs qui commencent par /
        if (url.startsWith('/')) return true;
        
        // Valider les URLs complètes
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

      console.log('✅ URLs validées:', validUrls);

      const updated = await prisma.playerProfile.update({
        where: { id: playerProfile.id },
        data: {
          videoUrls: validUrls,
        },
      });

      console.log('💾 Profil mis à jour, videoUrls:', updated.videoUrls);

      return res.status(200).json({
        success: true,
        videos: validUrls,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in videos API:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
