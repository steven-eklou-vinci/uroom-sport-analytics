import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID invalide' });
  const player = await prisma.playerProfile.findUnique({
    where: { id },
    include: {
      assessments: { include: { metrics: true } },
      reports: true,
    },
  });
  if (!player || !player.publicOptIn) return res.status(404).json({ error: 'Profil non public' });
  res.json(player);
}
