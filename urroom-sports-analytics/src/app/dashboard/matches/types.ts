export interface PlayerOption {
  id: string;
  firstName: string;
  lastName: string;
  positions: string[];
}

export interface MatchStatistic {
  key: string;
  value: number;
  unit: string | null;
}

export interface TrackedObject {
  id: string;
  trackId: number;
  objectClass: string;
  playerId: string | null;
  associationConfirmed: boolean;
  team: string | null;
  player: PlayerOption | null;
  statistics: MatchStatistic[];
}

export type MatchStatus = 'UPLOADED' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface MatchAnalysis {
  id: string;
  title: string;
  opponent: string | null;
  matchDate: string | null;
  videoUrl: string;
  annotatedVideoUrl: string | null;
  hasAnnotatedVideo: boolean;
  hasTrackFrames: boolean;
  status: MatchStatus;
  processedFrames: number | null;
  fps: number | null;
  error: string | null;
  createdAt: string;
  players: TrackedObject[];
}

export const statusLabels: Record<MatchStatus, string> = {
  UPLOADED: 'Importé',
  QUEUED: 'En file',
  PROCESSING: 'Analyse en cours',
  COMPLETED: 'Analyse terminée',
  FAILED: 'Échec',
  CANCELLED: 'Annulée',
};

export const classLabels: Record<string, string> = {
  player: 'Joueur',
  person: 'Personne à vérifier',
  referee: 'Arbitre',
  ball: 'Ballon',
};

export function isAssociableClass(objectClass: string): boolean {
  return objectClass === 'player' || objectClass === 'person';
}

export function playerName(player: PlayerOption | null): string | null {
  return player ? `${player.firstName} ${player.lastName}` : null;
}

export function getStatistic(track: TrackedObject, key: string): number | null {
  const value = track.statistics.find((stat) => stat.key === key)?.value;
  return typeof value === 'number' ? value : null;
}

export function formatTrackMeta(track: TrackedObject): string {
  const detections = getStatistic(track, 'detections') ?? 0;
  const visibleSeconds = getStatistic(track, 'visible_seconds') ?? 0;
  return `${detections} détections · ${visibleSeconds.toFixed(1)} s`;
}

export function formatPasses(track: TrackedObject): string | null {
  const attempted = getStatistic(track, 'passes_attempted');
  if (attempted === null) return null;
  const completed = getStatistic(track, 'passes_completed') ?? 0;
  const failed = getStatistic(track, 'passes_failed') ?? 0;
  const rate = attempted > 0 ? Math.round((completed / attempted) * 100) : 0;
  return `${completed}/${attempted} réussies · ${failed} ratées · ${rate} %`;
}
