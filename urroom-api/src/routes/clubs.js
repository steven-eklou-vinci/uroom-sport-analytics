import express from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();

// GET /clubs - liste tous les clubs
router.get('/', async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      include: { users: true, shortlists: true }
    });
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /clubs/:id - détail d'un club
router.get('/:id', async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.params.id },
      include: { users: true, shortlists: true }
    });
    if (!club) return res.status(404).json({ error: 'Club non trouvé' });
    res.json(club);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /clubs - création d'un club
router.post('/', async (req, res) => {
  try {
    const club = await prisma.club.create({
      data: req.body
    });
    res.status(201).json(club);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /clubs/:id - modification d'un club
router.put('/:id', async (req, res) => {
  try {
    const club = await prisma.club.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(club);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /clubs/:id - suppression d'un club
router.delete('/:id', async (req, res) => {
  try {
    await prisma.club.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
