'use client';

import styles from './MatchesPage.module.css';
import {
  TrackedObject,
  PlayerOption,
  classLabels,
  isAssociableClass,
  formatTrackMeta,
  formatPasses,
  playerName,
} from './types';

interface TrackedObjectRowProps {
  track: TrackedObject;
  players: PlayerOption[];
  onAssign: (trackId: number, playerId: string) => void;
  onToggleConfirmation: (trackId: number, confirm: boolean) => void;
}

export default function TrackedObjectRow({
  track,
  players,
  onAssign,
  onToggleConfirmation,
}: TrackedObjectRowProps) {
  const assignedName = playerName(track.player);
  const passes = formatPasses(track);
  const label = track.associationConfirmed && assignedName
    ? `${assignedName} · confirmé`
    : assignedName
      ? `${assignedName} · à confirmer`
      : classLabels[track.objectClass] || track.objectClass;

  return (
    <div className={styles.trackRow}>
      <div className={styles.trackLabel}>
        <strong>#{track.trackId}</strong>
        <span>{label}</span>
        <small>{formatTrackMeta(track)}</small>
        {passes && <small className={styles.trackPasses}>Passes : {passes}</small>}
      </div>
      {isAssociableClass(track.objectClass) && (
        <div className={styles.associationControls}>
          <select
            aria-label={`Associer le track ${track.trackId} à un joueur`}
            value={track.playerId || ''}
            onChange={(event) => onAssign(track.trackId, event.target.value)}
          >
            <option value="">
              {track.objectClass === 'person' ? 'À vérifier / laisser vide...' : 'Laisser vide / associer...'}
            </option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.firstName} {player.lastName} · {player.positions.join(', ')}
              </option>
            ))}
          </select>
          {track.playerId && (
            <button
              type="button"
              className={track.associationConfirmed
                ? styles.associationConfirmedButton
                : styles.confirmAssociationButton}
              onClick={() => onToggleConfirmation(track.trackId, !track.associationConfirmed)}
            >
              {track.associationConfirmed ? 'Confirmée' : 'Confirmer'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
