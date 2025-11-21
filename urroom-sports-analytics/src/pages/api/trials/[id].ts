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
    const trial = await prisma.trialRequest.findUnique({ where: { id }, include: { player: true, club: true } });
    if (!trial) return res.status(404).json({ error: 'Demande non trouvée' });
    return res.json(trial);
  }

  if (req.method === 'PUT') {
    if (!['ADMIN'].includes(session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = req.body;
    const trial = await prisma.trialRequest.update({ where: { id }, data });
    return res.json(trial);
  }

  if (req.method === 'DELETE') {
    if (!['ADMIN'].includes(session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.trialRequest.delete({ where: { id } });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
