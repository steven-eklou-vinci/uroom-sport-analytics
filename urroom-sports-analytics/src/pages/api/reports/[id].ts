import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !['ADMIN', 'SCOUT', 'CLUB'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID invalide' });

  if (req.method === 'GET') {
    const report = await prisma.report.findUnique({ where: { id }, include: { player: true, assessment: true } });
    if (!report) return res.status(404).json({ error: 'Rapport non trouvé' });
    return res.json(report);
  }

  if (req.method === 'PUT') {
    if (!['ADMIN', 'SCOUT'].includes(session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = req.body;
    const report = await prisma.report.update({ where: { id }, data });
    return res.json(report);
  }

  if (req.method === 'DELETE') {
    if (!['ADMIN', 'SCOUT'].includes(session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.report.delete({ where: { id } });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
