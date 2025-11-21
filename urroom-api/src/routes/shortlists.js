import express from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();

// GET /shortlists - liste toutes les shortlists
router.get('/', async (req, res) => {
  try {
    const shortlists = await prisma.shortlist.findMany({
      include: { club: true, players: true }
    });
    res.json(shortlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /shortlists/:id - détail d'une shortlist
router.get('/:id', async (req, res) => {
  try {
    const shortlist = await prisma.shortlist.findUnique({
      where: { id: req.params.id },
      include: { club: true, players: true }
    });
    if (!shortlist) return res.status(404).json({ error: 'Shortlist non trouvée' });
    res.json(shortlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /shortlists - création d'une shortlist
router.post('/', async (req, res) => {
  try {
    const shortlist = await prisma.shortlist.create({
      data: req.body
    });
    res.status(201).json(shortlist);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /shortlists/:id - modification d'une shortlist
router.put('/:id', async (req, res) => {
  try {
    const shortlist = await prisma.shortlist.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(shortlist);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /shortlists/:id - suppression d'une shortlist
router.delete('/:id', async (req, res) => {
  try {
    await prisma.shortlist.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
