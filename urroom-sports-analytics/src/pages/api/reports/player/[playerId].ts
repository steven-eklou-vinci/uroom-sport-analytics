import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { playerId } = req.query;
  const userRole = (req.query.userRole as string) || session.user.role;

  if (req.method === 'GET') {
    try {
      const reports = await prisma.report.findMany({
        where: {
          playerId: playerId as string
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Si l'utilisateur n'est pas un club ou admin, masquer clubFit
      const shouldShowClubFit = userRole === 'CLUB' || userRole === 'ADMIN';

      const filteredReports = reports.map(report => {
        if (shouldShowClubFit) {
          return report;
        } else {
          const { clubFit, ...reportWithoutClubFit } = report;
          return reportWithoutClubFit;
        }
      });

      return res.status(200).json(filteredReports);
    } catch (error) {
      console.error('Error fetching player reports:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
