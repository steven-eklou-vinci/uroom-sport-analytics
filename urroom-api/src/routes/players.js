import express from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();

// GET /players - liste tous les joueurs
router.get('/', async (req, res) => {
  try {
    const players = await prisma.playerProfile.findMany({
      include: { assessments: true, user: true, reports: true, trialRequests: true, shortlists: true }
    });
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /players/:id - détail d'un joueur
router.get('/:id', async (req, res) => {
  try {
    const player = await prisma.playerProfile.findUnique({
      where: { id: req.params.id },
      include: { assessments: true, user: true, reports: true, trialRequests: true, shortlists: true }
    });
    if (!player) return res.status(404).json({ error: 'Joueur non trouvé' });
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /players - création d'un joueur
router.post('/', async (req, res) => {
  try {
    const player = await prisma.playerProfile.create({
      data: req.body
    });
    res.status(201).json(player);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /players/:id - modification d'un joueur
router.put('/:id', async (req, res) => {
  try {
    const player = await prisma.playerProfile.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(player);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /players/:id - suppression d'un joueur
router.delete('/:id', async (req, res) => {
  try {
    await prisma.playerProfile.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
