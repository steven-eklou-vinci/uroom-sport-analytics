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

// GET /players/search - recherche de joueurs par nom
router.get('/search', async (req, res) => {
  try {
    const { firstName, lastName } = req.query;

    if (!firstName && !lastName) {
      return res.status(400).json({ 
        error: 'Au moins firstName ou lastName est requis' 
      });
    }

    const whereClause = {};
    if (firstName) {
      whereClause.firstName = {
        contains: firstName,
        mode: 'insensitive'
      };
    }
    if (lastName) {
      whereClause.lastName = {
        contains: lastName,
        mode: 'insensitive'
      };
    }

    const players = await prisma.playerProfile.findMany({
      where: whereClause,
      include: {
        createdByScout: {
          select: { id: true, name: true, email: true }
        },
        reports: {
          select: {
            id: true,
            summary: true,
            strengths: true,
            weaknesses: true,
            createdAt: true,
            author: {
              select: { id: true, name: true }
            }
          }
        }
      }
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
      include: { 
        assessments: {
          include: {
            metrics: true
          }
        }, 
        user: {
          include: {
            managedClub: true
          }
        }, 
        createdByScout: {
          select: { id: true, name: true, email: true }
        },
        reports: {
          select: {
            id: true,
            summary: true,
            strengths: true,
            weaknesses: true,
            clubFit: true,
            createdAt: true,
            author: {
              select: { id: true, name: true }
            }
          }
        },
        trialRequests: true, 
        shortlists: true 
      }
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

// POST /players/scout-create - création d'un joueur par un scout
router.post('/scout-create', async (req, res) => {
  try {
    const { firstName, lastName, age, positions, scoutId } = req.body;

    // Validation des champs requis
    if (!firstName || !lastName || !age || !positions || !scoutId) {
      return res.status(400).json({ 
        error: 'firstName, lastName, age, positions et scoutId sont requis' 
      });
    }

    // Vérifier que le scout existe
    const scout = await prisma.user.findUnique({
      where: { id: scoutId }
    });

    if (!scout || scout.role !== 'SCOUT') {
      return res.status(403).json({ 
        error: 'Seuls les scouts peuvent créer des profils joueurs' 
      });
    }

    // Créer le joueur
    const player = await prisma.playerProfile.create({
      data: {
        firstName,
        lastName,
        age,
        positions: Array.isArray(positions) ? positions : [positions],
        dataSource: 'SCOUT_CREATED',
        createdByScoutId: scoutId,
        tags: [],
        videoUrls: []
      },
      include: {
        createdByScout: true
      }
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
