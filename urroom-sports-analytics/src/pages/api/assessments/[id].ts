import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !['ADMIN', 'SCOUT'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID invalide' });

  if (req.method === 'GET') {
    const assessment = await prisma.assessment.findUnique({ where: { id }, include: { metrics: true, player: true } });
    if (!assessment) return res.status(404).json({ error: 'Évaluation non trouvée' });
    return res.json(assessment);
  }

  if (req.method === 'PUT') {
    const data = req.body;
    const assessment = await prisma.assessment.update({ where: { id }, data });
    return res.json(assessment);
  }

  if (req.method === 'DELETE') {
    await prisma.assessment.delete({ where: { id } });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
