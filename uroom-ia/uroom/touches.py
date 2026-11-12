"""Touches de balle et passes détectées par événements (et non par possession).

Pourquoi
--------
L'ancienne logique cherchait « qui possède le ballon » image par image, puis
éliminait toute possession de moins de 0,4 s. Or un joueur qui joue en une touche
ne « possède » le ballon que 2 à 8 images : il disparaissait, et la passe était
attribuée à un autre.

Principe
--------
Un coup de pied se voit sur la trajectoire du **ballon** : sa vitesse change
brusquement. On détecte ces événements (``detect_touch_events``), puis on
attribue chacun au joueur le plus proche des pieds autour de cet instant
(``attribute_touches``). Si deux joueurs sont presque à égale distance, la touche
est ``contested`` : on ne tranche pas (pas de passe attribuée au défenseur par hasard).

Les passes sont ensuite les enchaînements de touches entre deux joueurs
différents (``passes_from_touches``).

Tous les seuils sont en **hauteurs de joueur** pour rester valables quelle que soit
la distance à la caméra ; ce sont des points de départ à régler sur tes vidéos.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Mapping, Optional, Sequence

import numpy as np


# ---------------------------------------------------------------------------
# Trajectoire du ballon
# ---------------------------------------------------------------------------

def select_ball_positions(
    candidates: Sequence[Optional[np.ndarray]],
    player_height: float,
    fps: float,
    max_step_heights: float = 0.9,
    reacquire_s: float = 1.0,
    static_fraction: float = 0.2,
    static_min_s: float = 20.0,
) -> np.ndarray:
    """Choisit au plus un ballon par frame parmi les candidats (x1,y1,x2,y2,conf).

    * rejette les objets immobiles tout au long de la vidéo (point de penalty, plot…) ;
    * ne garde que les candidats cohérents avec la position précédente
      (le ballon ne saute pas d'un bout du terrain à l'autre en une image) ;
    * ré-acquiert sur le candidat le plus confiant après ``reacquire_s`` sans ballon.

    Retourne un tableau (T, 2) de centres, NaN quand aucun ballon n'est retenu.
    """
    T = len(candidates)
    out = np.full((T, 2), np.nan)
    cell = max(2.0, 0.3 * player_height)

    counts: Counter = Counter()
    frames_with = 0
    for c in candidates:
        if c is None or len(c) == 0:
            continue
        frames_with += 1
        cx = (c[:, 0] + c[:, 2]) / 2
        cy = (c[:, 1] + c[:, 3]) / 2
        counts.update({(int(a // cell), int(b // cell)) for a, b in zip(cx, cy)})
    static_limit = max(static_fraction * frames_with, static_min_s * fps)
    static_cells = {key for key, n in counts.items() if n >= static_limit}

    last_xy: Optional[np.ndarray] = None
    last_f = -10 ** 9
    for f, c in enumerate(candidates):
        if c is None or len(c) == 0:
            continue
        centres = np.column_stack(((c[:, 0] + c[:, 2]) / 2, (c[:, 1] + c[:, 3]) / 2))
        conf = c[:, 4].astype(np.float64)
        if static_cells:
            moving = np.array([(int(a // cell), int(b // cell)) not in static_cells for a, b in centres])
            if not moving.any():
                continue
            centres, conf = centres[moving], conf[moving]
        if last_xy is None or (f - last_f) > reacquire_s * fps:
            k = int(np.argmax(conf))
        else:
            gate = player_height * (max_step_heights * (f - last_f) + 0.5)
            dist = np.linalg.norm(centres - last_xy, axis=1)
            ok = dist <= gate
            if not ok.any():
                continue
            score = np.where(ok, conf - 0.5 * dist / gate, -np.inf)
            k = int(np.argmax(score))
        out[f] = centres[k]
        last_xy, last_f = centres[k], f
    return out


def interpolate_ball(xy: np.ndarray, max_gap_frames: int = 6) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Interpole linéairement les trous courts. Retourne (xy, observé, valide)."""
    out = xy.copy()
    observed = ~np.isnan(xy[:, 0])
    idx = np.flatnonzero(observed)
    for a, b in zip(idx[:-1], idx[1:]):
        gap = int(b - a - 1)
        if 0 < gap <= max_gap_frames:
            t = (np.arange(a + 1, b) - a) / float(b - a)
            out[a + 1:b] = xy[a] + (xy[b] - xy[a]) * t[:, None]
    valid = ~np.isnan(out[:, 0])
    return out, observed, valid


@dataclass
class TouchEvent:
    frame: int            # image où la trajectoire change
    lo: int               # observation précédente (la touche a eu lieu entre lo et hi)
    hi: int               # observation suivante
    strength: float       # variation de vitesse, en hauteurs de joueur par seconde


def detect_touch_events(
    xy: np.ndarray,
    observed: np.ndarray,
    player_height: float,
    fps: float,
    min_change_heights_per_s: float = 3.5,
    max_obs_gap_frames: int = 12,
    min_separation_frames: int = 4,
    min_span_frames: int = 3,
) -> list[TouchEvent]:
    """Changements brusques de vitesse du ballon, tolérants aux détections espacées.

    On n'utilise que les positions réellement DÉTECTÉES : la vitesse est calculée entre
    deux détections consécutives (même séparées de plusieurs images), puis on compare la
    vitesse avant et après chaque détection. Un coup de pied ou un contrôle fait varier
    cette vitesse ; un dribble (petits changements) reste en dessous du seuil.

    ``min_change_heights_per_s`` : variation de vitesse minimale en hauteurs de joueur
    par seconde (~3,5 ≈ 5 m/s pour un joueur de 1,5 m). Baisse-le si des passes courtes
    manquent ; monte-le si de fausses touches apparaissent (voir replay_analysis).
    ``max_obs_gap_frames`` : au-delà de ce trou entre deux détections, la vitesse n'est
    plus fiable et on n'en tire pas d'événement. ``min_span_frames`` : durée minimale sur
    laquelle chaque vitesse est mesurée (anti-bruit).
    """
    idx = np.flatnonzero(observed)
    if len(idx) < 3:
        return []
    points = xy[idx]
    scale = fps / max(1.0, player_height)

    # Pour chaque détection j : vitesse AVANT (vers une détection >= min_span images plus tôt)
    # et APRÈS (vers une détection >= min_span images plus tard). Moyenner sur quelques
    # images évite que le bruit de la boîte (±1-3 px) fabrique de fausses touches.
    before = np.searchsorted(idx, idx - min_span_frames, side="right") - 1
    after = np.searchsorted(idx, idx + min_span_frames, side="left")
    found: list[TouchEvent] = []
    for j in range(len(idx)):
        a, b = int(before[j]), int(after[j])
        if a < 0 or b >= len(idx):
            continue
        span_before, span_after = int(idx[j] - idx[a]), int(idx[b] - idx[j])
        if span_before > max_obs_gap_frames or span_after > max_obs_gap_frames:
            continue
        v_before = (points[j] - points[a]) / span_before
        v_after = (points[b] - points[j]) / span_after
        strength = float(np.hypot(*(v_after - v_before)) * scale)
        if strength >= min_change_heights_per_s:
            found.append(TouchEvent(int(idx[j]), int(idx[a]), int(idx[b]), strength))

    kept: list[TouchEvent] = []
    for event in sorted(found, key=lambda e: -e.strength):
        if all(abs(event.frame - other.frame) > min_separation_frames for other in kept):
            kept.append(event)
    return sorted(kept, key=lambda e: e.frame)


# ---------------------------------------------------------------------------
# Attribution
# ---------------------------------------------------------------------------

@dataclass
class Touch:
    frame: int
    gid: Optional[int]
    quality: str                    # "clear" | "contested" | "none"
    runner_up: Optional[int] = None
    strength: float = 0.0


def attribute_touches(
    events: Sequence[TouchEvent],
    frame_players: Sequence[tuple[np.ndarray, np.ndarray]],
    ball_xy: np.ndarray,
    min_window: int = 2,
    max_window: int = 8,
    max_ratio: float = 0.6,
    ambiguity: float = 0.75,
    foot_zone: float = 0.55,
) -> list[Touch]:
    """Attribue chaque événement au joueur le plus proche des pieds.

    ``frame_players[f] = (gids, boxes)`` (boxes: (n, 4)). La distance est mesurée aux
    deux coins et au milieu du bas de la boîte, normalisée par la hauteur du joueur ;
    le ballon doit être à hauteur de jambe (sinon il est en l'air et n'est à personne).

    Comme les détections du ballon sont espacées, la touche a pu avoir lieu n'importe où
    entre la détection précédente et la suivante : on examine toute cette fenêtre
    (au moins ±``min_window`` images, au plus ±``max_window``) et on retient la meilleure
    distance de chaque joueur. ``ball_xy`` doit être interpolé sur ces trous.

    Si le meilleur et le second sont presque à égalité (``ambiguity``), la touche est
    ``contested`` : 0,75 signifie « le second est à moins de 1,33× la distance du meilleur ».
    """
    touches: list[Touch] = []
    T = len(frame_players)
    for event in events:
        f = event.frame
        first = max(0, f - max_window, min(event.lo, f - min_window))
        last = min(T - 1, f + max_window, max(event.hi, f + min_window))
        best: dict[int, float] = {}
        for g in range(first, last + 1):
            bx, by = ball_xy[g]
            if np.isnan(bx):
                continue
            gids, boxes = frame_players[g]
            if len(gids) == 0:
                continue
            h = np.maximum(1.0, boxes[:, 3] - boxes[:, 1])
            in_zone = (by >= boxes[:, 1] + foot_zone * h) & (by <= boxes[:, 3] + 0.25 * h)
            if not in_zone.any():
                continue
            d_left = np.hypot(boxes[:, 0] - bx, boxes[:, 3] - by)
            d_right = np.hypot(boxes[:, 2] - bx, boxes[:, 3] - by)
            d_mid = np.hypot((boxes[:, 0] + boxes[:, 2]) / 2 - bx, boxes[:, 3] - by)
            ratio = np.minimum(np.minimum(d_left, d_right), d_mid) / h
            for idx in np.flatnonzero(in_zone & (ratio <= max_ratio)):
                gid = int(gids[idx])
                if ratio[idx] < best.get(gid, np.inf):
                    best[gid] = float(ratio[idx])
        ranked = sorted(best.items(), key=lambda kv: kv[1])
        if not ranked:
            touches.append(Touch(frame=int(f), gid=None, quality="none", strength=event.strength))
            continue
        runner_up = ranked[1][0] if len(ranked) > 1 else None
        contested = len(ranked) > 1 and ranked[0][1] > ambiguity * ranked[1][1]
        touches.append(Touch(
            frame=int(f),
            gid=ranked[0][0],
            quality="contested" if contested else "clear",
            runner_up=runner_up,
            strength=event.strength,
        ))
    return touches


# ---------------------------------------------------------------------------
# Passes
# ---------------------------------------------------------------------------

def passes_from_touches(
    touches: Sequence[Touch],
    team_of_gid: Mapping[int, int],
    fps: float,
    max_gap_s: float = 3.0,
    none_breaks_chain: bool = False,
) -> tuple[dict[int, dict[str, int]], list[dict], dict[str, int]]:
    """Passes = touches consécutives de deux joueurs différents, rapprochées dans le temps.

    Une passe n'est comptée (réussie / perdue) que si les DEUX touches sont nettes
    et que les équipes sont connues. Sinon elle est classée « incertaine » : on
    préfère ne pas la compter plutôt que de l'attribuer au mauvais joueur.

    Une touche non attribuée (aucun joueur près du ballon : rebond, bruit de détection)
    est ignorée par défaut ; avec ``none_breaks_chain=True`` elle casse l'enchaînement.

    Retourne (stats par identité, événements de passe, compteurs de rejets). Les rejets
    permettent de comprendre pourquoi une passe n'est pas comptée.
    """
    stats: dict[int, dict[str, int]] = defaultdict(lambda: {
        "touches": 0, "attempted": 0, "completed": 0, "failed": 0, "uncertain": 0,
    })
    dropped = {"sameGid": 0, "gapTooLong": 0, "unattributedSkipped": 0}
    events: list[dict] = []
    for t in touches:
        if t.gid is not None and t.quality == "clear":
            stats[t.gid]["touches"] += 1

    max_gap = int(round(max_gap_s * fps))
    previous: Optional[Touch] = None
    pending_unattributed = False
    for t in touches:
        if t.gid is None:
            dropped["unattributedSkipped"] += 1
            if none_breaks_chain:
                previous = None
            pending_unattributed = True
            continue
        a, b = previous, t
        previous = t
        if a is None:
            continue
        if a.gid == b.gid:
            dropped["sameGid"] += 1
            continue
        if b.frame - a.frame > max_gap:
            dropped["gapTooLong"] += 1
            continue
        outcome = "uncertain"
        if a.quality == "clear" and b.quality == "clear":
            ta, tb = team_of_gid.get(a.gid, 0), team_of_gid.get(b.gid, 0)
            if ta and tb:
                outcome = "completed" if ta == tb else "failed"
        entry = stats[a.gid]
        if outcome == "uncertain":
            entry["uncertain"] += 1
        else:
            entry["attempted"] += 1
            entry[outcome] += 1
        events.append({
            "frame": a.frame, "toFrame": b.frame,
            "from": a.gid, "to": b.gid, "outcome": outcome,
            "fromQuality": a.quality, "toQuality": b.quality,
        })
    return dict(stats), events, dropped