import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID invalide' });

  if (req.method === 'GET') {
    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) return res.status(404).json({ error: 'Club non trouvé' });
    return res.json(club);
  }

  if (req.method === 'PUT') {
    const data = req.body;
    const club = await prisma.club.update({ where: { id }, data });
    return res.json(club);
  }

  if (req.method === 'DELETE') {
    await prisma.club.delete({ where: { id } });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
