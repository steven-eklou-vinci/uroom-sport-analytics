import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import { parse } from 'csv-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !['ADMIN', 'SCOUT'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'Erreur upload' });
    const file = files.file as formidable.File | undefined;
    if (!file) return res.status(400).json({ error: 'Fichier manquant' });
    const records: any[] = [];
    fs.createReadStream(file.filepath)
      .pipe(parse({ columns: true, delimiter: ',' }))
      .on('data', (row) => records.push(row))
      .on('end', async () => {
        // Mapping simple: playerId, key, value, unit
        for (const row of records) {
          if (row.playerId && row.key && row.value && row.unit) {
            await prisma.metric.create({
              data: {
                assessmentId: row.assessmentId,
                key: row.key,
                value: parseFloat(row.value),
                unit: row.unit,
              },
            });
          }
        }
        res.status(200).json({ imported: records.length });
      });
  });
}
