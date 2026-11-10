/** Client-side helpers for editing match tracking associations. */

interface PatchResult {
  error?: string;
}

async function sendMatchPatch(body: Record<string, unknown>): Promise<Response> {
  const response = await fetch('/api/matches', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let message = 'La requête a échoué';
    try {
      const result = await response.json() as PatchResult;
      if (result.error) message = result.error;
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  return response;
}

/** Assigns (or clears, with a null id) the player profile linked to a tracked object. */
export async function assignTrackPlayer(matchId: string, trackId: number, playerId: string | null) {
  await sendMatchPatch({ matchId, trackId, playerId });
}

/** Marks a player association as confirmed or pending. */
export async function setTrackAssociationConfirmed(matchId: string, trackId: number, confirm: boolean) {
  await sendMatchPatch({
    action: confirm ? 'confirm-association' : 'unconfirm-association',
    matchId,
    trackId,
  });
}

/** Confirms every pending player association of a match at once. */
export async function confirmAllTrackAssociations(matchId: string) {
  await sendMatchPatch({ action: 'confirm-all-associations', matchId });
}
