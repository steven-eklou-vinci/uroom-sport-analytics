'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TrackedMatchVideo from './TrackedMatchVideo';
import styles from './MatchesPage.module.css';

interface PlayerOption {
  id: string;
  firstName: string;
  lastName: string;
  positions: string[];
}

interface MatchStatistic {
  key: string;
  value: number;
  unit: string | null;
}

interface TrackedObject {
  id: string;
  trackId: number;
  objectClass: string;
  playerId: string | null;
  associationConfirmed: boolean;
  player: PlayerOption | null;
  statistics: MatchStatistic[];
}

interface MatchAnalysis {
  id: string;
  title: string;
  opponent: string | null;
  matchDate: string | null;
  videoUrl: string;
  annotatedVideoUrl: string | null;
  hasAnnotatedVideo: boolean;
  hasTrackFrames: boolean;
  status: 'UPLOADED' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  processedFrames: number | null;
  fps: number | null;
  error: string | null;
  createdAt: string;
  players: TrackedObject[];
}

const statusLabels: Record<MatchAnalysis['status'], string> = {
  UPLOADED: 'Importé',
  QUEUED: 'En file',
  PROCESSING: 'Analyse en cours',
  COMPLETED: 'Analyse terminée',
  FAILED: 'Échec',
  CANCELLED: 'Annulée',
};

const classLabels: Record<string, string> = {
  player: 'Joueur',
  person: 'Personne à vérifier',
  referee: 'Arbitre',
  ball: 'Ballon',
};

export default function MatchesPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [matches, setMatches] = useState<MatchAnalysis[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [cancellingMatchId, setCancellingMatchId] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');
  const [formMessage, setFormMessage] = useState('');

  const loadMatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/matches');
      if (!response.ok) throw new Error('Impossible de charger les analyses de match');
      const data = await response.json() as { matches: MatchAnalysis[]; players: PlayerOption[] };
      setMatches(data.matches);
      setPlayers(data.players);
      setPageError('');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Erreur de chargement');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/auth/login');
    if (sessionStatus === 'authenticated') void loadMatches();
  }, [sessionStatus, router, loadMatches]);

  const hasActiveAnalysis = matches.some((match) =>
    match.status === 'QUEUED' || match.status === 'PROCESSING'
  );

  useEffect(() => {
    if (!hasActiveAnalysis) return;
    const timer = window.setInterval(() => void loadMatches(true), 5000);
    return () => window.clearInterval(timer);
  }, [hasActiveAnalysis, loadMatches]);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!video) {
      setFormMessage('Sélectionnez une vidéo de match.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('opponent', opponent.trim());
    formData.append('matchDate', matchDate);
    formData.append('video', video);

    setSubmitting(true);
    setUploadProgress(0);
    setFormMessage('Téléversement et démarrage du suivi...');
    try {
      const result = await new Promise<{ status: MatchAnalysis['status'] }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', '/api/matches');
        request.upload.addEventListener('progress', (progressEvent) => {
          if (!progressEvent.lengthComputable) return;
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(progress);
          setFormMessage(`Téléversement de la vidéo : ${progress} %`);
        });
        request.addEventListener('load', () => {
          let response: { status?: MatchAnalysis['status']; error?: string } = {};
          try {
            response = JSON.parse(request.responseText);
          } catch {
            reject(new Error('Réponse invalide du serveur après le téléversement'));
            return;
          }
          if (request.status < 200 || request.status >= 300) {
            reject(new Error(response.error || `Échec du téléversement (${request.status})`));
            return;
          }
          resolve({ status: response.status || 'FAILED' });
        });
        request.addEventListener('error', () => reject(new Error('Erreur réseau pendant le téléversement')));
        request.send(formData);
      });
      setTitle('');
      setOpponent('');
      setMatchDate('');
      setVideo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFormMessage(result.status === 'FAILED'
        ? 'Vidéo enregistrée, mais le service de tracking n’a pas pu démarrer.'
        : 'Match ajouté. Le suivi commence en arrière-plan.');
      await loadMatches(true);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Erreur pendant le téléversement');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handlePlayerAssignment = async (matchId: string, trackId: number, playerId: string) => {
    const response = await fetch('/api/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, trackId, playerId: playerId || null }),
    });
    if (!response.ok) {
      const result = await response.json();
      setPageError(result.error || 'Impossible d’associer ce track au joueur');
      return;
    }
    await loadMatches(true);
  };

  const handleAssociationConfirmation = async (matchId: string, trackId: number, confirm: boolean) => {
    const response = await fetch('/api/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: confirm ? 'confirm-association' : 'unconfirm-association',
        matchId,
        trackId,
      }),
    });
    if (!response.ok) {
      const result = await response.json();
      setPageError(result.error || 'Impossible de confirmer cette association');
      return;
    }
    await loadMatches(true);
  };

  const handleConfirmAllAssociations = async (matchId: string) => {
    const response = await fetch('/api/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm-all-associations', matchId }),
    });
    if (!response.ok) {
      const result = await response.json();
      setPageError(result.error || 'Impossible de confirmer les associations');
      return;
    }
    await loadMatches(true);
  };

  const handleDeleteMatch = async (match: MatchAnalysis) => {
    if (!window.confirm(`Supprimer « ${match.title} » et ses données de suivi ? Cette action est définitive.`)) {
      return;
    }

    setDeletingMatchId(match.id);
    setPageError('');
    try {
      const response = await fetch(`/api/matches?id=${encodeURIComponent(match.id)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible de supprimer ce match');
      await loadMatches(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Erreur pendant la suppression');
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleCancelAnalysis = async (match: MatchAnalysis) => {
    if (!window.confirm(`Annuler l’analyse de « ${match.title} » ?`)) return;

    setCancellingMatchId(match.id);
    setPageError('');
    try {
      const response = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', matchId: match.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible d’annuler cette analyse');
      await loadMatches(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Erreur pendant l’annulation');
    } finally {
      setCancellingMatchId(null);
    }
  };

  if (loading) return <div className={styles.loading}>Chargement des matchs...</div>;

  const trackedPlayerCount = matches.reduce((total, match) =>
    total + match.players.filter((track) => track.associationConfirmed && track.playerId).length, 0
  );

  return (
    <main className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Suivi longitudinal</p>
          <h1 className={styles.title}>Analyse des matchs</h1>
          <p className={styles.subtitle}>Importez une vidéo, suivez les IDs détectés et rattachez-les aux profils joueurs.</p>
        </div>
        <div className={styles.headerStats}>
          <div><strong>{matches.length}</strong><span>matchs</span></div>
          <div><strong>{trackedPlayerCount}</strong><span>tracks joueurs</span></div>
        </div>
      </header>

      {pageError && <p className={styles.errorBanner} role="alert">{pageError}</p>}

      <section className={styles.uploadSection} aria-labelledby="upload-title">
        <div className={styles.sectionHeading}>
          <span className={styles.step}>01</span>
          <div>
            <h2 id="upload-title">Nouveau match</h2>
            <p>Les fichiers restent privés et ne sont visibles que par leur créateur et les administrateurs.</p>
          </div>
        </div>
        <form className={styles.uploadForm} onSubmit={handleUpload}>
          <label className={styles.field}>
            <span>Nom du match</span>
            <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. U16 · championnat régional" />
          </label>
          <label className={styles.field}>
            <span>Adversaire</span>
            <input value={opponent} onChange={(event) => setOpponent(event.target.value)} placeholder="Nom du club" />
          </label>
          <label className={styles.field}>
            <span>Date du match</span>
            <input type="date" value={matchDate} onChange={(event) => setMatchDate(event.target.value)} />
          </label>
          <label className={`${styles.field} ${styles.fileField}`}>
            <span>Vidéo du match</span>
            <input
              ref={fileInputRef}
              required
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,.m4v"
              onChange={(event) => setVideo(event.target.files?.[0] || null)}
            />
            <small>{video ? `${video.name} · ${(video.size / 1024 ** 3).toFixed(2)} Go` : 'MP4, MOV, M4V, AVI, MKV ou WebM · 10 Go max'}</small>
          </label>
          <div className={styles.formFooter}>
            <p className={styles.formMessage} role="status">
              {uploadProgress !== null ? `${formMessage} · ${video ? ((video.size * uploadProgress) / 100 / 1024 ** 3).toFixed(2) : '0'} Go envoyés` : formMessage}
            </p>
            <button className={styles.submitButton} type="submit" disabled={submitting}>
              {submitting ? 'Envoi en cours...' : 'Importer et analyser'}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.matchesSection} aria-labelledby="matches-title">
        <div className={styles.listHeading}>
          <div>
            <p className={styles.eyebrow}>Bibliothèque</p>
            <h2 id="matches-title">Matchs enregistrés</h2>
          </div>
          <button type="button" className={styles.refreshButton} onClick={() => void loadMatches()} title="Actualiser la liste">
            Actualiser
          </button>
        </div>

        {matches.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyMark}>00</span>
            <p>Aucun match importé pour le moment.</p>
          </div>
        ) : (
          <div className={styles.matchList}>
            {matches.map((match) => {
              const playerTracks = match.players.filter((track) => track.associationConfirmed && track.playerId);
              const pendingAssociations = match.players.filter((track) => track.playerId && !track.associationConfirmed).length;
              return (
                <article className={styles.matchItem} key={match.id}>
                  <div className={styles.matchTopline}>
                    <div className={styles.matchIdentity}>
                      <h3>{match.title}</h3>
                      <p>{[match.opponent, match.matchDate && new Date(match.matchDate).toLocaleDateString('fr-FR')].filter(Boolean).join(' · ') || 'Date et adversaire non renseignés'}</p>
                    </div>
                    <div className={styles.matchActions}>
                      <span className={`${styles.status} ${styles[`status${match.status}`]}`}>
                        {statusLabels[match.status]}
                      </span>
                      {match.status === 'QUEUED' || match.status === 'PROCESSING' ? (
                        <button
                          type="button"
                          className={styles.cancelButton}
                          disabled={cancellingMatchId === match.id}
                          onClick={() => void handleCancelAnalysis(match)}
                        >
                          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M4 4l8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          {cancellingMatchId === match.id ? 'Annulation...' : 'Annuler l’analyse'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.deleteButton}
                          disabled={deletingMatchId === match.id}
                          onClick={() => void handleDeleteMatch(match)}
                          title="Supprimer le match"
                        >
                          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M2.5 4.5h11M6 4.5V3h4v1.5m2.5 0-.6 9h-5.8l-.6-9m2.5 2.5v4m2-4v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {deletingMatchId === match.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      )}
                    </div>
                  </div>

                  {match.error && <p className={styles.matchError}>{match.error}</p>}

                  {match.status === 'COMPLETED' && (
                    <div className={styles.analysisMeta}>
                      <span>{match.processedFrames?.toLocaleString('fr-FR') || 0} images traitées</span>
                      <span>{playerTracks.length} tracks joueurs</span>
                      {match.fps && <span>{match.fps.toFixed(1)} images/s</span>}
                    </div>
                  )}

                  <div className={styles.matchContent}>
                    <TrackedMatchVideo
                      matchId={match.id}
                      originalVideoUrl={match.videoUrl}
                      annotatedVideoUrl={match.annotatedVideoUrl}
                      hasAnnotatedVideo={match.hasAnnotatedVideo}
                      hasTrackFrames={match.hasTrackFrames}
                      fps={match.fps}
                      confirmedTracks={playerTracks.map((track) => ({
                        trackId: track.trackId,
                        playerName: track.player
                          ? `${track.player.firstName} ${track.player.lastName}`
                          : 'Joueur',
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
                            onClick={() => void handleConfirmAllAssociations(match.id)}
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
                          {match.players.map((track) => {
                            const detections = track.statistics.find((stat) => stat.key === 'detections')?.value || 0;
                            const visibleSeconds = track.statistics.find((stat) => stat.key === 'visible_seconds')?.value || 0;
                            return (
                              <div className={styles.trackRow} key={track.id}>
                                <div className={styles.trackLabel}>
                                  <strong>#{track.trackId}</strong>
                                  <span>
                                    {track.associationConfirmed && track.player
                                      ? `${track.player.firstName} ${track.player.lastName} · confirmé`
                                      : track.player
                                        ? `${track.player.firstName} ${track.player.lastName} · à confirmer`
                                        : classLabels[track.objectClass] || track.objectClass}
                                  </span>
                                  <small>{detections} détections · {visibleSeconds.toFixed(1)} s</small>
                                </div>
                                {(track.objectClass === 'player' || track.objectClass === 'person') && (
                                  <div className={styles.associationControls}>
                                    <select
                                      aria-label={`Associer le track ${track.trackId} à un joueur`}
                                      value={track.playerId || ''}
                                      onChange={(event) => void handlePlayerAssignment(match.id, track.trackId, event.target.value)}
                                    >
                                      <option value="">{track.objectClass === 'person' ? 'À vérifier / laisser vide...' : 'Laisser vide / associer...'}</option>
                                      {players.map((player) => (
                                        <option key={player.id} value={player.id}>
                                          {player.firstName} {player.lastName} · {player.positions.join(', ')}
                                        </option>
                                      ))}
                                    </select>
                                    {track.playerId && (
                                      <button
                                        type="button"
                                        className={track.associationConfirmed ? styles.associationConfirmedButton : styles.confirmAssociationButton}
                                        onClick={() => void handleAssociationConfirmation(match.id, track.trackId, !track.associationConfirmed)}
                                      >
                                        {track.associationConfirmed ? 'Confirmée' : 'Confirmer'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}