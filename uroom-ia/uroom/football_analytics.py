"""Match analytics built on top of the YOLO tracking output.

Ported and adapted from the reference repositories:
  * AnshChoudhary/Football-Tracking — PlayerBallAssigner and TeamAssigner.

Contenu :
  * ``distance`` / ``box_center`` / ``jersey_colour`` : briques de base (utilisées par
    football_tracking.py, tracklets.py et touches.py) ;
  * ``cluster_two_teams`` : K-Means sur les couleurs de maillots, avec rejet des
    valeurs aberrantes (gardiens, arbitre) qui n'ont alors pas d'équipe ;
  * ``TeamClassifier`` : ancien classifieur par piste (conservé pour compatibilité) ;
  * ``PlayerBallAssigner`` / ``PossessionTracker`` / ``detect_passes`` : ancienne logique
    de possession image par image. **Legacy** : elle supprime les passes en une touche
    (voir touches.py pour la détection par événements, qui la remplace).
"""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Mapping, Optional, Sequence

import numpy as np


def distance(point_a: Sequence[float], point_b: Sequence[float]) -> float:
    return math.hypot(point_a[0] - point_b[0], point_a[1] - point_b[1])


def box_center(box: Sequence[float]) -> tuple[float, float]:
    return ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)


def jersey_colour(frame_bgr: np.ndarray, box: Sequence[float]) -> Optional[np.ndarray]:
    """Average colour of a player torso, discarding the green pitch.

    The jersey is assumed to sit in the upper half of the bounding box, matching
    the reference TeamAssigner heuristic.
    """
    left, top, right, bottom = (int(round(value)) for value in box)
    height = bottom - top
    width = right - left
    if top < 0 or left < 0 or height < 10 or width < 4:
        return None
    torso = frame_bgr[top:top + max(1, height // 2), left:right]
    if torso.size == 0:
        return None
    pixels = torso.reshape(-1, 3).astype(np.float32)
    blue, green, red = pixels[:, 0], pixels[:, 1], pixels[:, 2]
    pitch = (green > red * 1.12) & (green > blue * 1.12)
    jersey = pixels[~pitch]
    if jersey.shape[0] < 12:
        return None
    return jersey.mean(axis=0)


def cluster_two_teams(
    colours: Mapping[int, np.ndarray],
    outlier_factor: float = 2.5,
    outlier_floor: float = 25.0,
) -> dict[int, int]:
    """Répartit des couleurs moyennes (BGR) en deux équipes (1 et 2).

    Les éléments trop éloignés de leur centre (gardiens, arbitre, couleur mal
    mesurée) ne reçoivent PAS d'équipe : mieux vaut « inconnu » qu'une équipe
    fausse, car l'équipe décide si une passe est réussie ou perdue.

    ``outlier_floor`` (distance BGR minimale avant de parler d'aberrant) et
    ``outlier_factor`` (multiple de la distance médiane) sont des seuils
    heuristiques à ajuster sur tes vidéos.
    """
    keys = list(colours)
    if len(keys) < 2:
        return {}
    matrix = np.stack([np.asarray(colours[key], dtype=np.float64) for key in keys])
    if np.allclose(matrix, matrix[0]):
        return {}
    try:
        from sklearn.cluster import KMeans
    except ImportError:
        return {}

    def fit(rows: np.ndarray):
        model = KMeans(n_clusters=2, init="k-means++", n_init=10, random_state=0)
        labels = model.fit_predict(rows)
        distances = np.linalg.norm(rows - model.cluster_centers_[labels], axis=1)
        return model, labels, distances

    model, labels, distances = fit(matrix)
    limit = max(outlier_floor, outlier_factor * float(np.median(distances)))
    inliers = distances <= limit
    # Deuxième passe : on réajuste les centres sans les aberrants (ils tirent le K-Means).
    if 2 <= inliers.sum() < len(keys) and not np.allclose(matrix[inliers], matrix[inliers][0]):
        model, labels_in, _ = fit(matrix[inliers])
        labels = model.predict(matrix)
        distances = np.linalg.norm(matrix - model.cluster_centers_[labels], axis=1)
        limit = max(outlier_floor, outlier_factor * float(np.median(distances[inliers])))
        inliers = distances <= limit
    return {key: int(label) + 1 for key, label, ok in zip(keys, labels, inliers) if ok}


class TeamClassifier:
    """Clusters player tracks into two teams from their jersey colours (par piste)."""

    def __init__(self, sample_interval: int = 12, max_samples_per_track: int = 240):
        self.sample_interval = max(1, sample_interval)
        self.max_samples_per_track = max_samples_per_track
        self._observations: dict[int, int] = {}
        self._colour_sums: dict[int, np.ndarray] = {}
        self._colour_counts: dict[int, int] = {}
        self._teams: dict[int, int] = {}

    def observe(self, track_id: int, frame_bgr: np.ndarray, box: Sequence[float]) -> None:
        seen = self._observations.get(track_id, 0) + 1
        self._observations[track_id] = seen
        if seen % self.sample_interval:
            return
        if self._colour_counts.get(track_id, 0) >= self.max_samples_per_track:
            return
        colour = jersey_colour(frame_bgr, box)
        if colour is None:
            return
        self._colour_sums[track_id] = self._colour_sums.get(track_id, np.zeros(3)) + colour
        self._colour_counts[track_id] = self._colour_counts.get(track_id, 0) + 1

    def assign_teams(self) -> None:
        averages = {
            track_id: self._colour_sums[track_id] / count
            for track_id, count in self._colour_counts.items()
            if count > 0
        }
        self._teams = cluster_two_teams(averages)

    def team_for(self, track_id: int) -> Optional[int]:
        return self._teams.get(track_id)


# ---------------------------------------------------------------------------
# LEGACY — possession image par image (conservé pour ne rien casser).
# Le pipeline actuel utilise touches.py à la place.
# ---------------------------------------------------------------------------

class PlayerBallAssigner:
    """Assigns the ball to the closest player, measured from their feet corners."""

    def __init__(
        self,
        max_distance_ratio: float = 0.6,
        max_distance_px: float = 80.0,
        foot_zone_ratio: float = 0.5,
    ):
        self.max_distance_ratio = max_distance_ratio
        self.max_distance_px = max_distance_px
        self.foot_zone_ratio = foot_zone_ratio

    def assign(self, players: Sequence[tuple[int, Sequence[float]]], ball_box: Optional[Sequence[float]]) -> Optional[int]:
        if ball_box is None or not players:
            return None
        ball_x, ball_y = box_center(ball_box)
        best_track_id: Optional[int] = None
        best_distance = math.inf
        for track_id, box in players:
            height = max(1.0, box[3] - box[1])
            if ball_y < box[1] + height * self.foot_zone_ratio:
                continue
            threshold = min(self.max_distance_px, height * self.max_distance_ratio)
            player_distance = min(
                distance((box[0], box[3]), (ball_x, ball_y)),
                distance((box[2], box[3]), (ball_x, ball_y)),
            )
            if player_distance <= threshold and player_distance < best_distance:
                best_track_id, best_distance = track_id, player_distance
        return best_track_id


class PossessionTracker:
    """Owns the ball across frames, persisting possession between detections (legacy)."""

    def __init__(self, assigner: PlayerBallAssigner, max_gap_frames: int, min_detections: int = 2):
        self._assigner = assigner
        self._max_gap_frames = max(1, max_gap_frames)
        self._min_detections = max(1, min_detections)
        self._holder: Optional[int] = None
        self._holder_frame = -10**9
        self._candidate: Optional[int] = None
        self._candidate_hits = 0

    def update(
        self,
        frame_index: int,
        players: Sequence[tuple[int, Sequence[float]]],
        ball_box: Optional[Sequence[float]],
    ) -> Optional[int]:
        if ball_box is not None:
            detected = self._assigner.assign(players, ball_box)
            if detected is None:
                self._candidate = None
                self._candidate_hits = 0
            else:
                if detected == self._candidate:
                    self._candidate_hits += 1
                else:
                    self._candidate = detected
                    self._candidate_hits = 1
                if self._candidate_hits >= self._min_detections:
                    self._holder = detected
                    self._holder_frame = frame_index
        if self._holder is not None and frame_index - self._holder_frame > self._max_gap_frames:
            self._holder = None
        return self._holder


def detect_passes(
    possession: Sequence[Optional[int]],
    team_for,
    fps: float,
    min_hold_seconds: float = 0.4,
    max_gap_seconds: float = 2.0,
) -> dict[int, dict[str, int]]:
    """LEGACY : passes à partir d'une liste de possession image par image.

    ``min_hold_seconds`` élimine toute possession plus courte que 0,4 s, donc les
    joueurs d'une passe en une touche. Utilise touches.passes_from_touches à la place.
    """
    min_hold_frames = max(1, int(round(min_hold_seconds * fps)))
    max_gap_frames = max(min_hold_frames, int(round(max_gap_seconds * fps)))

    possessions: list[tuple[int, int, Optional[int]]] = []
    run_track: Optional[int] = None
    run_start = 0
    run_length = 0
    for frame, holder in enumerate(possession):
        if holder == run_track:
            run_length += 1
            continue
        if run_track is not None and run_length >= min_hold_frames:
            possessions.append((run_start, run_start + run_length - 1, run_track))
        run_track, run_start, run_length = holder, frame, 1
    if run_track is not None and run_length >= min_hold_frames:
        possessions.append((run_start, run_start + run_length - 1, run_track))

    passes: dict[int, dict[str, int]] = defaultdict(
        lambda: {"attempted": 0, "completed": 0, "failed": 0}
    )
    for previous, current in zip(possessions, possessions[1:]):
        previous_track, previous_end = previous[2], previous[1]
        current_track, current_start = current[2], current[0]
        if previous_track is None or current_track is None or previous_track == current_track:
            continue
        if current_start - previous_end > max_gap_frames:
            continue
        passer_team = team_for(previous_track)
        receiver_team = team_for(current_track)
        if passer_team is None or receiver_team is None:
            continue
        entry = passes[previous_track]
        entry["attempted"] += 1
        if passer_team == receiver_team:
            entry["completed"] += 1
        else:
            entry["failed"] += 1
    return dict(passes)