import { prisma } from './prisma';

export interface TrackingJobTrack {
  trackId: number;
  class: string;
  detections: number;
  firstFrame: number;
  lastFrame: number;
  visibleSeconds: number;
  team?: number | null;
  passesAttempted?: number;
  passesCompleted?: number;
  passesFailed?: number;
}

export interface TrackingJob {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  annotatedVideoAvailable?: boolean;
  trackFramesAvailable?: boolean;
  processedFrames?: number;
  fps?: number;
  tracks?: TrackingJobTrack[];
  error?: string;
}

export function getAnalysisServiceUrl(): string {
  return (process.env.IA_MODEL_URL || 'http://localhost:8000').replace(/\/$/, '');
}

export function getServiceHeaders(): Record<string, string> {
  const token = process.env.IA_SERVICE_TOKEN;
  return token ? { 'X-Uroom-Service-Token': token } : {};
}

function buildStatisticRows(track: TrackingJobTrack) {
  const rows = [
    { key: 'detections', value: track.detections, unit: 'frames' },
    { key: 'first_frame', value: track.firstFrame, unit: 'frame' },
    { key: 'last_frame', value: track.lastFrame, unit: 'frame' },
    { key: 'visible_seconds', value: track.visibleSeconds, unit: 's' },
  ];
  if (typeof track.passesAttempted === 'number') {
    rows.push({ key: 'passes_attempted', value: track.passesAttempted, unit: 'passes' });
    rows.push({ key: 'passes_completed', value: track.passesCompleted ?? 0, unit: 'passes' });
    rows.push({ key: 'passes_failed', value: track.passesFailed ?? 0, unit: 'passes' });
  }
  return rows;
}

/** Pulls the latest status of an in-flight tracking job and mirrors it into the database. */
export async function syncAnalysis(matchId: string, jobId: string, currentStatus: string) {
  if (!['QUEUED', 'PROCESSING'].includes(currentStatus)) return;

  try {
    const response = await fetch(`${getAnalysisServiceUrl()}/match/jobs/${jobId}`, {
      headers: getServiceHeaders(),
    });
    if (!response.ok) return;

    const job = await response.json() as TrackingJob;
    if (job.status === 'COMPLETED') {
      await prisma.$transaction(async (transaction) => {
        await transaction.matchPlayerTracking.deleteMany({ where: { matchId } });
        for (const track of job.tracks || []) {
          await transaction.matchPlayerTracking.create({
            data: {
              matchId,
              trackId: track.trackId,
              objectClass: track.class,
              associationConfirmed: false,
              team: track.team != null ? String(track.team) : null,
              statistics: { create: buildStatisticRows(track) },
            },
          });
        }
        await transaction.matchAnalysis.update({
          where: { id: matchId },
          data: {
            status: 'COMPLETED',
            processedFrames: job.processedFrames,
            fps: job.fps,
            hasAnnotatedVideo: job.annotatedVideoAvailable === true,
            hasTrackFrames: job.trackFramesAvailable === true,
            error: null,
          },
        });
      });
    } else if (job.status === 'FAILED') {
      await prisma.matchAnalysis.update({
        where: { id: matchId },
        data: { status: 'FAILED', error: job.error || 'Échec de l’analyse vidéo' },
      });
    } else if (job.status === 'CANCELLED') {
      await prisma.matchAnalysis.update({
        where: { id: matchId },
        data: { status: 'CANCELLED', error: null },
      });
    } else if (job.status === 'PROCESSING' && currentStatus !== 'PROCESSING') {
      await prisma.matchAnalysis.update({ where: { id: matchId }, data: { status: 'PROCESSING' } });
    }
  } catch (error) {
    console.error('Unable to synchronize match analysis:', error);
  }
}
