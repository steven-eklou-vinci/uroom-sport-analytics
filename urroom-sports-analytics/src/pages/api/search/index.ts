import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { q, entity } = req.query;
  const query = typeof q === 'string' ? q : '';
  const entityType = typeof entity === 'string' ? entity : 'players';

  if (entityType === 'players') {
    const players = await prisma.playerProfile.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { nationality: { contains: query, mode: 'insensitive' } },
          { position: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
    return res.json({ results: players });
  }
  if (entityType === 'clubs') {
    const clubs = await prisma.club.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { country: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
    return res.json({ results: clubs });
  }
  return res.status(400).json({ error: 'Entité non supportée' });
}
