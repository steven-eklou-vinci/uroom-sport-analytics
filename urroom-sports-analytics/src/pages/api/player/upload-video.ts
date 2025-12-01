import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    // Vérifier que l'utilisateur a un profil joueur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        players: true,
      },
    });

    if (!user || !user.players || user.players.length === 0) {
      return res.status(404).json({ error: 'Profil joueur non trouvé' });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      multiples: false,
    });

    const [fields, files] = await form.parse(req);
    
    const videoFile = files.video?.[0];

    if (!videoFile) {
      return res.status(400).json({ error: 'Aucun fichier vidéo trouvé' });
    }

    // Vérifier le type MIME
    if (!videoFile.mimetype?.startsWith('video/')) {
      // Supprimer le fichier uploadé
      fs.unlinkSync(videoFile.filepath);
      return res.status(400).json({ error: 'Le fichier doit être une vidéo' });
    }

    // Renommer le fichier
    const ext = path.extname(videoFile.originalFilename || '');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const newFileName = `video-${user.players[0].id}-${uniqueSuffix}${ext}`;
    const newFilePath = path.join(uploadDir, newFileName);

    fs.renameSync(videoFile.filepath, newFilePath);

    // Construire l'URL publique
    const videoUrl = `/uploads/videos/${newFileName}`;

    return res.status(200).json({
      success: true,
      url: videoUrl,
      filename: newFileName,
    });
  } catch (error: any) {
    console.error('Error in upload-video API:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux (max 100 MB)' });
    }
    
    return res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  }
}
