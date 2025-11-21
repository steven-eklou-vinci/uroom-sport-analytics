import express from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();

// GET /trials - liste toutes les demandes d'essai
router.get('/', async (req, res) => {
  try {
    const trials = await prisma.trialRequest.findMany({
      include: { club: true, player: true }
    });
    res.json(trials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /trials/:id - détail d'une demande d'essai
router.get('/:id', async (req, res) => {
  try {
    const trial = await prisma.trialRequest.findUnique({
      where: { id: req.params.id },
      include: { club: true, player: true }
    });
    if (!trial) return res.status(404).json({ error: 'Demande non trouvée' });
    res.json(trial);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /trials - création d'une demande d'essai
router.post('/', async (req, res) => {
  try {
    const trial = await prisma.trialRequest.create({
      data: req.body
    });
    res.status(201).json(trial);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /trials/:id - modification d'une demande d'essai
router.put('/:id', async (req, res) => {
  try {
    const trial = await prisma.trialRequest.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(trial);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /trials/:id - suppression d'une demande d'essai
router.delete('/:id', async (req, res) => {
  try {
    await prisma.trialRequest.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
