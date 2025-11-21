import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !['ADMIN', 'CLUB'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID invalide' });

  if (req.method === 'GET') {
    const shortlist = await prisma.shortlist.findUnique({ where: { id }, include: { players: { include: { player: true } } } });
    if (!shortlist) return res.status(404).json({ error: 'Shortlist non trouvée' });
    return res.json(shortlist);
  }

  if (req.method === 'PUT') {
    const data = req.body;
    const shortlist = await prisma.shortlist.update({ where: { id }, data });
    return res.json(shortlist);
  }

  if (req.method === 'DELETE') {
    await prisma.shortlist.delete({ where: { id } });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
