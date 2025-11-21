import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !['ADMIN', 'SCOUT'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { playerId } = req.query;

    // If playerId is provided, filter by playerId
    const where = playerId && typeof playerId === 'string' ? { playerId } : {};
    
    const assessments = await prisma.assessment.findMany({ 
      where,
      include: { 
        metrics: true, 
        player: true 
      },
      orderBy: {
        date: 'desc'
      }
    });
    return res.json(assessments);
  }

  if (req.method === 'POST') {
    const data = req.body;
    const assessment = await prisma.assessment.create({ data });
    return res.status(201).json(assessment);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
