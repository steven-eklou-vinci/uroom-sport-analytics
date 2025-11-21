import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      let reports;
      
      // ADMIN voit tous les rapports
      if (session.user.role === 'ADMIN') {
        reports = await prisma.report.findMany({
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                positions: true,
                nationality: true,
              }
            },
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
          },
          orderBy: { createdAt: 'desc' }
        });
      }
      // SCOUT voit ses propres rapports
      else if (session.user.role === 'SCOUT') {
        reports = await prisma.report.findMany({
          where: {
            authorId: session.user.id
          },
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                positions: true,
                nationality: true,
              }
            },
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
          },
          orderBy: { createdAt: 'desc' }
        });
      }
      // CLUB voit les rapports des scouts affiliés à son club
      else if (session.user.role === 'CLUB') {
        // Récupérer le clubId de l'utilisateur
        const clubUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { clubId: true }
        });
        
        const clubId = clubUser?.clubId;
        
        console.log('Club user:', session.user.id, 'clubId:', clubId);
        
        if (!clubId) {
          return res.status(403).json({ error: 'Club not found' });
        }
        
        // Récupérer les scouts du club
        const clubScouts = await prisma.user.findMany({
          where: {
            role: 'SCOUT',
            clubId: clubId
          },
          select: { id: true }
        });
        
        console.log('Club scouts found:', clubScouts.length);
        
        const scoutIds = clubScouts.map(s => s.id);
        
        reports = await prisma.report.findMany({
          where: {
            authorId: { in: scoutIds }
          },
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                positions: true,
                nationality: true,
              }
            },
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
          },
          orderBy: { createdAt: 'desc' }
        });
        
        console.log('Reports found for club:', reports.length);
      }
      else {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return res.json(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    if (!['ADMIN', 'SCOUT'].includes(session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    try {
      const { playerId, summary, strengths, weaknesses, clubFit } = req.body;
      
      if (!playerId || !summary) {
        return res.status(400).json({ error: 'playerId and summary are required' });
      }
      
      const report = await prisma.report.create({ 
        data: {
          playerId,
          authorId: session.user.id,
          summary,
          strengths: strengths || [],
          weaknesses: weaknesses || [],
          clubFit: clubFit || []
        }
      });
      
      console.log('Report created:', report);
      
      return res.status(201).json(report);
    } catch (error) {
      console.error('Error creating report:', error);
      return res.status(500).json({ error: 'Failed to create report' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
