"""Analyse hors-ligne d'un match à partir des détections brutes.

Aucune dépendance à YOLO / OpenCV : on peut tester ce module avec des données
synthétiques ou rejouer une analyse sans relancer la détection.

Entrées
-------
* ``frames[f]``            : tableau (n, 9) [tid, x1, y1, x2, y2, role, b, g, r] des pistes du tracker
* ``ball_candidates[f]``   : tableau (m, 5) [x1, y1, x2, y2, conf] des ballons détectés (ou None)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Sequence

import numpy as np

from .touches import (
    Touch,
    TouchEvent,
    attribute_touches,
    detect_touch_events,
    interpolate_ball,
    passes_from_touches,
    select_ball_positions,
)
from .tracklets import (
    COL_ROLE,
    COL_X1,
    COL_X2,
    COL_Y1,
    COL_Y2,
    ROLE_PERSON,
    ROLE_REFEREE,
    StabilisedTracks,
    stabilise_tracks,
)

DEFAULT_PLAYER_HEIGHT = 60.0


@dataclass
class MatchAnalysis:
    fps: float
    stabilised: StabilisedTracks
    frame_gids: list[np.ndarray]            # identité par ligne, -1 = ligne écartée
    gid_info: dict[int, dict]
    ball_xy: np.ndarray                     # (T, 2) interpolé, NaN sinon
    ball_observed: np.ndarray               # (T,) bool : vraiment détecté
    ball_valid: np.ndarray                  # (T,) bool : détecté ou interpolé
    touches: list[Touch]
    pass_stats: dict[int, dict[str, int]]
    pass_events: list[dict]
    player_height: float
    raw_track_count: int = 0
    ball_candidate_frames: int = 0
    events: list[TouchEvent] = field(default_factory=list)
    dropped_pairs: dict[str, int] = field(default_factory=dict)

    def diagnostics(self) -> dict:
        """Entonnoir de détection : où se perdent les passes ? (voir replay_analysis.py)"""
        T = len(self.ball_observed)
        observed = np.flatnonzero(self.ball_observed)
        gaps = np.diff(observed) if len(observed) > 1 else np.array([])
        chains = int((gaps > 12).sum()) + 1 if len(observed) else 0
        qualities = [t.quality for t in self.touches]
        totals = {"attempted": 0, "completed": 0, "failed": 0, "uncertain": 0}
        for stats in self.pass_stats.values():
            for key in totals:
                totals[key] += stats.get(key, 0)
        return {
            "frames": T,
            "ball": {
                "framesWithCandidates": self.ball_candidate_frames,
                "observedAfterGating": int(len(observed)),
                "coveragePct": round(100.0 * len(observed) / T, 1) if T else 0.0,
                "medianGapFrames": float(np.median(gaps)) if len(gaps) else None,
                "largeGaps(>12f)": int((gaps > 12).sum()),
                "chains": chains,
            },
            "touchEvents": {
                "detected": len(self.events),
                "clear": qualities.count("clear"),
                "contested": qualities.count("contested"),
                "unattributed": qualities.count("none"),
            },
            "passes": totals,
            "pairsNotCounted": dict(self.dropped_pairs),
            "identities": len(self.gid_info),
            "playerHeightPx": round(self.player_height, 1),
        }

    def team_of(self, gid: int) -> Optional[int]:
        team = self.stabilised.team_by_gid.get(gid, 0)
        return team or None

    def track_summaries(self) -> list[dict]:
        """Résumé par identité globale, au format attendu par l'API (clés camelCase)."""
        out = []
        fps = self.fps
        for gid in sorted(self.gid_info):
            info = self.gid_info[gid]
            entry = {
                "trackId": int(gid),
                "class": info["class"],
                "detections": info["frames"],
                "firstFrame": info["first"],
                "lastFrame": info["last"],
                "visibleSeconds": round((info["last"] - info["first"] + 1) / fps, 2),
                "activeSeconds": round(info["frames"] / fps, 2),
                "uncertainFraction": round(info["uncertain"], 3),
            }
            if info["class"] in {"player", "person"}:
                passes = self.pass_stats.get(gid, {})
                entry["team"] = self.team_of(gid)
                entry["touches"] = passes.get("touches", 0)
                entry["passesAttempted"] = passes.get("attempted", 0)
                entry["passesCompleted"] = passes.get("completed", 0)
                entry["passesFailed"] = passes.get("failed", 0)
                entry["passesUncertain"] = passes.get("uncertain", 0)
            out.append(entry)
        return out


def _median_player_height(frames: Sequence[np.ndarray]) -> float:
    heights = [
        (arr[arr[:, COL_ROLE] != ROLE_REFEREE][:, COL_Y2] - arr[arr[:, COL_ROLE] != ROLE_REFEREE][:, COL_Y1])
        for arr in frames if arr is not None and len(arr)
    ]
    heights = [h for h in heights if len(h)]
    if not heights:
        return DEFAULT_PLAYER_HEIGHT
    return float(max(10.0, np.median(np.concatenate(heights))))


def _gid_statistics(frames: Sequence[np.ndarray], stabilised: StabilisedTracks) -> dict[int, dict]:
    T = len(frames)
    lengths = [len(g) for g in stabilised.gids]
    if not T or not sum(lengths):
        return {}
    all_g = np.concatenate(stabilised.gids)
    all_f = np.repeat(np.arange(T), lengths)
    all_role = np.concatenate([
        arr[:, COL_ROLE] if arr is not None and len(arr) else np.empty(0) for arr in frames
    ]).astype(int)
    all_unc = np.concatenate(stabilised.uncertain)
    selected = np.flatnonzero(all_g >= 0)
    if not selected.size:
        return {}
    order = selected[np.argsort(all_g[selected], kind="stable")]
    sorted_g = all_g[order]
    unique, start = np.unique(sorted_g, return_index=True)
    stop = np.append(start[1:], len(order))
    info: dict[int, dict] = {}
    for gid, a, b in zip(unique, start, stop):
        idx = order[a:b]
        roles = all_role[idx]
        referee = float((roles == ROLE_REFEREE).mean()) > 0.5
        person = float((roles == ROLE_PERSON).mean()) > 0.5
        info[int(gid)] = {
            "first": int(all_f[idx].min()),
            "last": int(all_f[idx].max()),
            "frames": int(len(idx)),
            "class": "referee" if referee else ("person" if person else "player"),
            "uncertain": float(all_unc[idx].mean()),
        }
    return info


def analyse_match(
    frames: Sequence[np.ndarray],
    ball_candidates: Sequence[Optional[np.ndarray]],
    fps: float,
    min_track_seconds: float = 0.5,
    tracklet_params: Optional[dict] = None,
    ball_params: Optional[dict] = None,
    touch_params: Optional[dict] = None,
    attribution_params: Optional[dict] = None,
    pass_params: Optional[dict] = None,
) -> MatchAnalysis:
    tracklet_params = tracklet_params or {}
    ball_params = ball_params or {}
    touch_params = touch_params or {}
    attribution_params = attribution_params or {}
    pass_params = pass_params or {}
    T = len(frames)

    stabilised = stabilise_tracks(frames, fps, **tracklet_params)
    gid_info = _gid_statistics(frames, stabilised)
    min_frames = max(1, int(round(min_track_seconds * fps)))
    kept = {g for g, info in gid_info.items() if info["frames"] >= min_frames}
    gid_info = {g: info for g, info in gid_info.items() if g in kept}

    frame_gids: list[np.ndarray] = []
    for g in stabilised.gids:
        out = g.copy()
        if out.size:
            out[~np.isin(out, list(kept))] = -1
        frame_gids.append(out)

    height = _median_player_height(frames)
    raw_ids = {int(t) for arr in frames if arr is not None and len(arr) for t in arr[:, 0]}

    # --- ballon
    padded = list(ball_candidates) + [None] * max(0, T - len(ball_candidates))
    ball_raw = select_ball_positions(padded[:T], height, fps, **ball_params)
    ball_xy, observed, valid = interpolate_ball(ball_raw, max_gap_frames=15)
    candidate_frames = sum(1 for c in padded[:T] if c is not None and len(c))

    # --- touches (joueurs uniquement, identités retenues)
    frame_players: list[tuple[np.ndarray, np.ndarray]] = []
    for f in range(T):
        arr = frames[f]
        if arr is None or len(arr) == 0:
            frame_players.append((np.empty(0, dtype=np.int64), np.empty((0, 4))))
            continue
        mask = (frame_gids[f] >= 0) & (arr[:, COL_ROLE] != ROLE_REFEREE)
        frame_players.append((
            frame_gids[f][mask],
            np.asarray(arr[mask][:, COL_X1:COL_Y2 + 1], dtype=np.float64),
        ))
    events = detect_touch_events(ball_xy, observed, height, fps, **touch_params)
    touches = attribute_touches(events, frame_players, ball_xy, **attribution_params)
    team_of = {g: stabilised.team_by_gid.get(g, 0) for g in kept}
    pass_stats, pass_events, dropped = passes_from_touches(touches, team_of, fps, **pass_params)

    return MatchAnalysis(
        fps=fps,
        stabilised=stabilised,
        frame_gids=frame_gids,
        gid_info=gid_info,
        ball_xy=ball_xy,
        ball_observed=observed,
        ball_valid=valid,
        touches=touches,
        pass_stats=pass_stats,
        pass_events=pass_events,
        player_height=height,
        raw_track_count=len(raw_ids),
        ball_candidate_frames=candidate_frames,
        events=events,
        dropped_pairs=dropped,
    )


# ---------------------------------------------------------------------------
# Détections brutes : sauvegarde / rechargement (permet de rejouer l'analyse en
# quelques secondes avec d'autres seuils, sans relancer YOLO)
# ---------------------------------------------------------------------------

def save_raw_detections(path, frames: Sequence[np.ndarray], ball_candidates: Sequence[Optional[np.ndarray]], fps: float) -> None:
    rows = [a for a in frames if a is not None and len(a)]
    balls = [c for c in ball_candidates if c is not None and len(c)]
    np.savez_compressed(
        path,
        fps=np.float64(fps),
        rows=np.concatenate(rows) if rows else np.empty((0, 9), dtype=np.float32),
        row_counts=np.array([0 if a is None else len(a) for a in frames], dtype=np.int64),
        ball=np.concatenate(balls) if balls else np.empty((0, 5), dtype=np.float32),
        ball_counts=np.array([0 if c is None else len(c) for c in ball_candidates], dtype=np.int64),
    )


def load_raw_detections(path) -> tuple[list[np.ndarray], list[Optional[np.ndarray]], float]:
    data = np.load(path)
    frames, balls = [], []
    position = ball_position = 0
    for count in data["row_counts"]:
        frames.append(data["rows"][position:position + count])
        position += int(count)
    for count in data["ball_counts"]:
        balls.append(data["ball"][ball_position:ball_position + count] if count else None)
        ball_position += int(count)
    return frames, balls, float(data["fps"])