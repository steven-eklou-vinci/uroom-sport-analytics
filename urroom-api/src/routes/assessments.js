import express from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();

// GET /assessments - liste toutes les évaluations
router.get('/', async (req, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      include: { player: true, scout: true, metrics: true }
    });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /assessments/:id - détail d'une évaluation
router.get('/:id', async (req, res) => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: { player: true, scout: true, metrics: true }
    });
    if (!assessment) return res.status(404).json({ error: 'Évaluation non trouvée' });
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /assessments - création d'une évaluation
router.post('/', async (req, res) => {
  try {
    const assessment = await prisma.assessment.create({
      data: req.body
    });
    res.status(201).json(assessment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /assessments/:id - modification d'une évaluation
router.put('/:id', async (req, res) => {
  try {
    const assessment = await prisma.assessment.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(assessment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /assessments/:id - suppression d'une évaluation
router.delete('/:id', async (req, res) => {
  try {
    await prisma.assessment.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
