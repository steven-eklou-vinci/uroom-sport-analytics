'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import TrackedMatchVideo from '../TrackedMatchVideo';
import TrackedObjectRow from '../TrackedObjectRow';
import styles from '../MatchesPage.module.css';
import {
  MatchAnalysis,
  PlayerOption,
  statusLabels,
  playerName,
  getStatistic,
  formatTrackMeta,
} from '../types';
import {
  assignTrackPlayer,
  setTrackAssociationConfirmed,
  confirmAllTrackAssociations,
} from '../../../../lib/matchTrackingClient';

export default function MatchDetailPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const matchId = params?.id as string;

  const [match, setMatch] = useState<MatchAnalysis | null>(null);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const loadMatch = useCallback(async (silent = false) => {
    if (!matchId) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      if (response.status === 404) {
        setMatch(null);
        setPageError('Ce match est introuvable.');
        return;
      }
      if (!response.ok) throw new Error('Impossible de charger le détail du match');
      const data = await response.json() as { match: MatchAnalysis; players: PlayerOption[] };
      setMatch(data.match);
      setPlayers(data.players);
      setPageError('');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Erreur de chargement');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/auth/login');
    if (sessionStatus === 'authenticated') void loadMatch();
  }, [sessionStatus, router, loadMatch]);

  const isActive = match?.status === 'QUEUED' || match?.status === 'PROCESSING';

  useEffect(() => {
    if (!isActive) return;
    const timer = window.setInterval(() => void loadMatch(true), 5000);
    return () => window.clearInterval(timer);
  }, [isActive, loadMatch]);

  const runMutation = async (action: () => Promise<void>, fallbackMessage: string) => {
    try {
      await action();
      await loadMatch(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : fallbackMessage);
    }
  };

  const handlePlayerAssignment = (trackId: number, playerId: string) =>
    runMutation(
      () => assignTrackPlayer(matchId, trackId, playerId || null),
      'Impossible d’associer ce track au joueur',
    );

  const handleAssociationConfirmation = (trackId: number, confirm: boolean) =>
    runMutation(
      () => setTrackAssociationConfirmed(matchId, trackId, confirm),
      'Impossible de confirmer cette association',
    );

  const handleConfirmAllAssociations = () =>
    runMutation(
      () => confirmAllTrackAssociations(matchId),
      'Impossible de confirmer les associations',
    );

  if (loading) return <div className={styles.loading}>Chargement du match...</div>;

  if (!match) {
    return (
      <main className={styles.container}>
        <Link href="/dashboard/matches" className={styles.backLink}>← Retour aux matchs</Link>
        {pageError && <p className={styles.errorBanner} role="alert">{pageError}</p>}
      </main>
    );
  }

  const confirmedTracks = match.players.filter((track) => track.associationConfirmed && track.playerId);
  const pendingAssociations = match.players.filter((track) => track.playerId && !track.associationConfirmed).length;
  const matchMeta = [match.opponent, match.matchDate && new Date(match.matchDate).toLocaleDateString('fr-FR')]
    .filter(Boolean).join(' · ') || 'Date et adversaire non renseignés';

  return (
    <main className={styles.container}>
      <Link href="/dashboard/matches" className={styles.backLink}>← Retour aux matchs</Link>

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Détail du match</p>
          <h1 className={styles.title}>{match.title}</h1>
          <p className={styles.subtitle}>{matchMeta}</p>
        </div>
        <div className={styles.headerStats}>
          <div><strong>{confirmedTracks.length}</strong><span>joueurs associés</span></div>
          <div><strong>{match.players.length}</strong><span>IDs détectés</span></div>
        </div>
      </header>

      {pageError && <p className={styles.errorBanner} role="alert">{pageError}</p>}
      {match.error && <p className={styles.matchError}>{match.error}</p>}

      <div className={styles.analysisMeta}>
        <span className={`${styles.status} ${styles[`status${match.status}`]}`}>{statusLabels[match.status]}</span>
        <span>{match.processedFrames?.toLocaleString('fr-FR') || 0} images traitées</span>
        {match.fps && <span>{match.fps.toFixed(1)} images/s</span>}
      </div>

      <div className={styles.matchContent}>
        <TrackedMatchVideo
          matchId={match.id}
          originalVideoUrl={match.videoUrl}
          annotatedVideoUrl={match.annotatedVideoUrl}
          hasAnnotatedVideo={match.hasAnnotatedVideo}
          hasTrackFrames={match.hasTrackFrames}
          fps={match.fps}
          initialMode="confirmed"
          confirmedTracks={confirmedTracks.map((track) => ({
            trackId: track.trackId,
            playerName: playerName(track.player) || 'Joueur',
          }))}
        />
        <div className={styles.trackPanel}>
          <div className={styles.trackHeading}>
            <h4>Objets suivis</h4>
            <span>{match.players.length}</span>
            {pendingAssociations > 0 && (
              <button
                type="button"
                className={styles.confirmAllButton}
                onClick={() => void handleConfirmAllAssociations()}
              >
                Confirmer {pendingAssociations} association{pendingAssociations > 1 ? 's' : ''}
              </button>
            )}
          </div>
          {match.status !== 'COMPLETED' ? (
            <p className={styles.trackHint}>Les objets et leurs IDs apparaîtront ici à la fin de l’analyse.</p>
          ) : match.players.length === 0 ? (
            <p className={styles.trackHint}>Aucun joueur suivi détecté dans cette vidéo.</p>
          ) : (
            <div className={styles.trackList}>
              {match.players.map((track) => (
                <TrackedObjectRow
                  key={track.id}
                  track={track}
                  players={players}
                  onAssign={handlePlayerAssignment}
                  onToggleConfirmation={handleAssociationConfirmation}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <section className={styles.statsSection} aria-labelledby="stats-title">
        <div className={styles.listHeading}>
          <div>
            <p className={styles.eyebrow}>Statistiques</p>
            <h2 id="stats-title">Joueurs associés</h2>
          </div>
        </div>
        {confirmedTracks.length === 0 ? (
          <p className={styles.trackHint}>
            Associez puis confirmez des IDs joueurs pour afficher leurs statistiques de match.
          </p>
        ) : (
          <div className={styles.statsGrid}>
            {confirmedTracks.map((track) => {
              const attempted = getStatistic(track, 'passes_attempted');
              const completed = getStatistic(track, 'passes_completed');
              const failed = getStatistic(track, 'passes_failed');
              const rate = attempted && attempted > 0
                ? `${Math.round(((completed || 0) / attempted) * 100)} %`
                : '—';
              return (
                <article className={styles.statCard} key={track.id}>
                  <div className={styles.statCardHeader}>
                    <strong>{playerName(track.player)}</strong>
                    <span>#{track.trackId}</span>
                  </div>
                  <p>{formatTrackMeta(track)}</p>
                  <div className={styles.statRow}><span>Passes réussies</span><strong>{completed ?? '—'}</strong></div>
                  <div className={styles.statRow}><span>Passes ratées</span><strong>{failed ?? '—'}</strong></div>
                  <div className={styles.statRow}><span>Passes tentées</span><strong>{attempted ?? '—'}</strong></div>
                  <div className={styles.statRow}><span>Précision</span><strong>{rate}</strong></div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
