import express from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ dest: 'uploads/' });

// POST /players/import-csv - Import CSV de joueurs
router.post('/import-csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier envoyé' });
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        const created = await prisma.$transaction(
          results.map(row =>
            prisma.playerProfile.create({ data: row })
          )
        );
        fs.unlinkSync(req.file.path);
        res.status(201).json({ count: created.length });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
});

// GET /players/export-csv - Export CSV des joueurs
router.get('/export-csv', async (req, res) => {
  try {
    const players = await prisma.playerProfile.findMany();
    const header = Object.keys(players[0] || {}).join(',') + '\n';
    const rows = players.map(p => Object.values(p).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="players.csv"');
    res.send(header + rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
