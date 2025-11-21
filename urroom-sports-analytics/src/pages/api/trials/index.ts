import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !['ADMIN', 'CLUB'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const trials = await prisma.trialRequest.findMany({ include: { player: true, club: true } });
    return res.json(trials);
  }

  if (req.method === 'POST') {
    if (!['CLUB'].includes(session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = req.body;
    const trial = await prisma.trialRequest.create({ data });
    return res.status(201).json(trial);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
