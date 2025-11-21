
import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Liste des joueurs - accessible à tous les rôles connectés
    const players = await prisma.playerProfile.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(players);
  }

  if (req.method === 'POST') {
    // Création réservée aux ADMIN et SCOUT
    if (!['ADMIN', 'SCOUT'].includes(session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ error: 'Erreur parsing form' });
      try {
        // Conversion des champs
        function getFieldString(field: any) {
          if (Array.isArray(field)) return field[0] || '';
          return field || '';
        }
        const positionsRaw = fields.positions ? JSON.parse(getFieldString(fields.positions)) : [];
        const positions = Array.isArray(positionsRaw) ? positionsRaw.filter(p => p && p.trim() !== '') : [];
        
        const data: any = {
          firstName: getFieldString(fields.firstName),
          lastName: getFieldString(fields.lastName),
          birthDate: new Date(getFieldString(fields.birthDate)),
          positions: positions,
          foot: getFieldString(fields.foot),
          nationality: getFieldString(fields.nationality),
          heightCm: fields.height ? parseInt(getFieldString(fields.height), 10) : null,
          weightKg: fields.weight ? parseInt(getFieldString(fields.weight), 10) : null,
          tags: [],
          videoUrls: [],
        };
        
        // Gestion de la photo (optionnel, à adapter si upload réel)
        if (files.photo && Array.isArray(files.photo) && files.photo[0]) {
          // TODO: upload réel, ici on stocke juste le nom
          data.photoUrl = '/uploads/' + files.photo[0].originalFilename;
        }
        
        const player = await prisma.playerProfile.create({ data });
        return res.status(201).json(player);
      } catch (e) {
        return res.status(500).json({ error: 'Erreur création joueur', details: e });
      }
    });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
