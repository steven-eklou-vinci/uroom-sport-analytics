import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !['ADMIN', 'SCOUT'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  const form = new formidable.IncomingForm({ uploadDir, keepExtensions: true });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'Erreur upload' });
    const file = files.file as formidable.File | undefined;
    if (!file) return res.status(400).json({ error: 'Fichier manquant' });
    const { assessmentId } = fields;
    if (!assessmentId || Array.isArray(assessmentId)) return res.status(400).json({ error: 'assessmentId manquant' });
    const videoUrl = `/uploads/${path.basename(file.filepath)}`;
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { videos: { push: videoUrl } },
    });
    res.status(200).json({ videoUrl });
  });
}
