import express from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();

// GET /reports - liste tous les rapports
router.get('/', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: { author: true, player: true, assessment: true }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /reports/:id - détail d'un rapport
router.get('/:id', async (req, res) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: { author: true, player: true, assessment: true }
    });
    if (!report) return res.status(404).json({ error: 'Rapport non trouvé' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /reports - création d'un rapport
router.post('/', async (req, res) => {
  try {
    const report = await prisma.report.create({
      data: req.body
    });
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /reports/:id - modification d'un rapport
router.put('/:id', async (req, res) => {
  try {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /reports/:id - suppression d'un rapport
router.delete('/:id', async (req, res) => {
  try {
    await prisma.report.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
