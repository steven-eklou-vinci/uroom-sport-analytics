import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !['ADMIN', 'SCOUT', 'CLUB'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID invalide' });
  const report = await prisma.report.findUnique({ where: { id }, include: { player: true, assessment: true } });
  if (!report) return res.status(404).json({ error: 'Rapport non trouvé' });

  // Génération PDF simple (pdf-lib)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText(`Rapport Joueur: ${report.player.firstName} ${report.player.lastName}`, { x: 50, y: 800, size: 20, font, color: rgb(0,0.5,0.5) });
  page.drawText(`Résumé: ${report.summary}`, { x: 50, y: 770, size: 14, font });
  page.drawText(`Forces: ${report.strengths.join(', ')}`, { x: 50, y: 750, size: 12, font });
  page.drawText(`Faiblesses: ${report.weaknesses.join(', ')}`, { x: 50, y: 730, size: 12, font });
  page.drawText(`Clubs adaptés: ${report.clubFit.join(', ')}`, { x: 50, y: 710, size: 12, font });
  const pdfBytes = await pdfDoc.save();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rapport-${report.player.lastName}.pdf"`);
  res.send(Buffer.from(pdfBytes));
}
