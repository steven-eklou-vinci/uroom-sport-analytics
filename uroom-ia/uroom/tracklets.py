"""Post-traitement hors-ligne des pistes : découpe aux contacts, puis recollage.

Pourquoi
--------
Un tracker en ligne (BoT-SORT) décide l'identité image par image. Quand deux
joueurs aux maillots identiques se croisent, il peut échanger leurs IDs sans que
rien ne le signale : l'erreur est silencieuse et corrompt toutes les stats.

Principe
--------
1. On **coupe** chaque piste au moment où sa boîte chevauche celle d'une autre
   (c'est exactement là que les IDs se mélangent) et quand une piste est perdue
   puis « retrouvée » après un long trou. Un swap devient un simple fragment.
2. On **recolle** les fragments par une affectation globale (un seul successeur /
   un seul prédécesseur par fragment), avec un coût fondé sur :
     - la position attendue (extrapolation de trajectoire dans les deux sens),
     - la vitesse plausible, la taille de la boîte,
     - l'équipe et la couleur du maillot (si disponibles).
3. Les liens dont un rival est presque aussi bon sont **marqués ambigus** : on
   ne devine pas, on signale (``uncertain``) pour que les stats puissent les ignorer.

Les frames de contact elles-mêmes reçoivent l'identité de la piste d'origine
(marquée incertaine), car c'est souvent là que se produisent les touches de balle.

Entrée : ``frames[f]`` = tableau (n, 9) par frame, colonnes
``[tid, x1, y1, x2, y2, role, b, g, r]`` (couleur = NaN quand non échantillonnée).
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional, Sequence

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import min_weight_full_bipartite_matching

from .football_analytics import cluster_two_teams

COL_TID, COL_X1, COL_Y1, COL_X2, COL_Y2, COL_ROLE, COL_B, COL_G, COL_R = range(9)
ROLE_PLAYER, ROLE_REFEREE, ROLE_PERSON = 0, 1, 2


@dataclass
class Segment:
    id: int
    track: int                      # ID d'origine donné par le tracker
    referee: bool
    frames: np.ndarray              # (k,) frames où le segment est observé
    boxes: np.ndarray               # (k, 4) x1, y1, x2, y2
    colour_mean: Optional[np.ndarray] = None
    colour_count: int = 0
    team: int = 0                   # 0 = inconnue

    @property
    def start(self) -> int:
        return int(self.frames[0])

    @property
    def end(self) -> int:
        return int(self.frames[-1])


@dataclass
class StabilisedTracks:
    segments: list[Segment]
    row_segments: list[np.ndarray]          # index de segment par ligne (-1 = aucun)
    mapping: dict[int, int]                 # segment.id -> identité globale
    ambiguous_segments: set[int]            # segments liés avec un doute
    gids: list[np.ndarray]                  # identité globale par ligne (-1 = inconnue)
    uncertain: list[np.ndarray]             # True si l'identité est incertaine
    team_by_gid: dict[int, int] = field(default_factory=dict)
    n_links: int = 0


def _iou_matrix(boxes: np.ndarray) -> np.ndarray:
    x1 = np.maximum(boxes[:, None, 0], boxes[None, :, 0])
    y1 = np.maximum(boxes[:, None, 1], boxes[None, :, 1])
    x2 = np.minimum(boxes[:, None, 2], boxes[None, :, 2])
    y2 = np.minimum(boxes[:, None, 3], boxes[None, :, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    area = np.clip(boxes[:, 2] - boxes[:, 0], 0, None) * np.clip(boxes[:, 3] - boxes[:, 1], 0, None)
    union = area[:, None] + area[None, :] - inter
    return np.where(union > 0, inter / np.where(union > 0, union, 1.0), 0.0)


def _centres(boxes: np.ndarray) -> np.ndarray:
    return np.column_stack(((boxes[:, 0] + boxes[:, 2]) / 2, (boxes[:, 1] + boxes[:, 3]) / 2))


# ---------------------------------------------------------------------------
# 1. Découpe
# ---------------------------------------------------------------------------

def build_segments(
    frames: Sequence[np.ndarray],
    contact_iou: float = 0.2,
    min_len: int = 3,
    split_gap_frames: int = 25,
    max_step_heights: float = 0.6,
) -> tuple[list[Segment], list[np.ndarray]]:
    """Coupe les pistes aux contacts, aux longs trous et aux sauts impossibles.

    ``max_step_heights`` : déplacement maximal plausible d'un joueur entre deux
    images, en hauteurs de joueur (un sprinteur fait ~0,1 par image à 25 fps).
    Un saut supérieur trahit un échange d'ID SANS contact visible entre les boîtes.

    Les lignes en contact ne font partie d'aucun segment (``row_segments == -1``) :
    leur identité n'est pas fiable. Les segments plus courts que ``min_len``
    sont écartés (bruit).
    """
    open_ids: dict[int, int] = {}
    seg_frames: list[list[int]] = []
    seg_boxes: list[list[np.ndarray]] = []
    seg_colours: list[list[np.ndarray]] = []
    seg_track: list[int] = []
    seg_referee: list[bool] = []
    row_segments: list[np.ndarray] = []

    for f, arr in enumerate(frames):
        n = 0 if arr is None else len(arr)
        rs = np.full(n, -1, dtype=np.int64)
        row_segments.append(rs)
        if n == 0:
            continue
        boxes = np.asarray(arr[:, COL_X1:COL_Y2 + 1], dtype=np.float64)
        contact = np.zeros(n, dtype=bool)
        if n > 1:
            iou = _iou_matrix(boxes)
            np.fill_diagonal(iou, 0.0)
            contact = (iou > contact_iou).any(axis=1)
        has_colour = arr.shape[1] > COL_R
        for k in range(n):
            tid = int(arr[k, COL_TID])
            if contact[k]:
                open_ids.pop(tid, None)
                continue
            idx = open_ids.get(tid)
            if idx is not None:
                gap = f - seg_frames[idx][-1]
                prev = seg_boxes[idx][-1]
                jump = np.hypot(
                    (boxes[k, 0] + boxes[k, 2]) / 2 - (prev[0] + prev[2]) / 2,
                    (boxes[k, 1] + boxes[k, 3]) / 2 - (prev[1] + prev[3]) / 2,
                )
                limit = max(1.0, prev[3] - prev[1]) * (max_step_heights * gap + 0.3)
                if gap > split_gap_frames or jump > limit:
                    idx = None                    # long trou ou saut : le recollage décidera
            if idx is None:
                idx = len(seg_frames)
                open_ids[tid] = idx
                seg_frames.append([])
                seg_boxes.append([])
                seg_colours.append([])
                seg_track.append(tid)
                seg_referee.append(int(arr[k, COL_ROLE]) == ROLE_REFEREE)
            seg_frames[idx].append(f)
            seg_boxes[idx].append(boxes[k])
            if has_colour:
                colour = arr[k, COL_B:COL_R + 1]
                if np.isfinite(colour).all():
                    seg_colours[idx].append(colour)
            rs[k] = idx

    segments: list[Segment] = []
    remap = np.full(len(seg_frames), -1, dtype=np.int64)
    for old, frames_list in enumerate(seg_frames):
        if len(frames_list) < min_len:
            continue
        new_id = len(segments)
        remap[old] = new_id
        colours = seg_colours[old]
        segments.append(Segment(
            id=new_id,
            track=seg_track[old],
            referee=seg_referee[old],
            frames=np.asarray(frames_list, dtype=np.int64),
            boxes=np.asarray(seg_boxes[old], dtype=np.float64),
            colour_mean=np.mean(colours, axis=0) if colours else None,
            colour_count=len(colours),
        ))
    for rs in row_segments:
        valid = rs >= 0
        rs[valid] = remap[rs[valid]]
    return segments, row_segments


# ---------------------------------------------------------------------------
# 2. Équipes par segment
# ---------------------------------------------------------------------------

def assign_segment_teams(
    segments: Sequence[Segment],
    min_samples: int = 3,
    outlier_factor: float = 2.5,
) -> dict[int, int]:
    """Équipe de chaque segment d'après la couleur du maillot (0 = inconnue)."""
    colours = {
        s.id: s.colour_mean
        for s in segments
        if not s.referee and s.colour_mean is not None and s.colour_count >= min_samples
    }
    teams = cluster_two_teams(colours, outlier_factor=outlier_factor)
    for s in segments:
        s.team = teams.get(s.id, 0)
    return teams


# ---------------------------------------------------------------------------
# 3. Recollage
# ---------------------------------------------------------------------------

def link_segments(
    segments: Sequence[Segment],
    fps: float,
    max_gap_s: float = 4.0,
    sprint_heights_per_s: float = 5.0,
    max_link_cost: float = 1.5,
    ambiguity_margin: float = 0.5,
    colour_gate: float = 50.0,
    min_colour_samples: int = 3,
    velocity_frames: int = 5,
) -> tuple[dict[int, int], set[int], int]:
    """Affectation globale fragment -> fragment suivant.

    Le coût est la distance (en hauteurs de joueur) entre la position attendue et
    la position observée, moyennée sur l'extrapolation avant et arrière.
    ``ambiguity_margin`` : un lien est ambigu si un rival est à moins de cette
    marge (en hauteurs de joueur).

    Retourne (mapping segment.id -> identité globale, ids de segments ambigus,
    nombre de liens).
    """
    n = len(segments)
    if n == 0:
        return {}, set(), 0
    first_box = np.array([s.boxes[0] for s in segments])
    last_box = np.array([s.boxes[-1] for s in segments])
    start_f = np.array([s.start for s in segments])
    end_f = np.array([s.end for s in segments])
    start_c, end_c = _centres(first_box), _centres(last_box)
    start_h = np.maximum(1.0, first_box[:, 3] - first_box[:, 1])
    end_h = np.maximum(1.0, last_box[:, 3] - last_box[:, 1])
    team = np.array([s.team for s in segments])
    referee = np.array([s.referee for s in segments])
    colour = np.full((n, 3), np.nan)
    for s in segments:
        if s.colour_mean is not None and s.colour_count >= min_colour_samples:
            colour[s.id] = s.colour_mean

    start_v = np.zeros((n, 2))
    end_v = np.zeros((n, 2))
    for i, s in enumerate(segments):
        k = min(velocity_frames, len(s.frames))
        if k >= 2:
            c_tail = _centres(s.boxes[-k:])
            end_v[i] = (c_tail[-1] - c_tail[0]) / max(1, int(s.frames[-1] - s.frames[-k]))
            c_head = _centres(s.boxes[:k])
            start_v[i] = (c_head[-1] - c_head[0]) / max(1, int(s.frames[k - 1] - s.frames[0]))

    max_gap = int(round(max_gap_s * fps))
    order = np.argsort(start_f, kind="stable")
    sorted_starts = start_f[order]
    rows_i: list[np.ndarray] = []
    rows_j: list[np.ndarray] = []
    rows_c: list[np.ndarray] = []
    for i in range(n):
        lo = np.searchsorted(sorted_starts, end_f[i] + 1, side="left")
        hi = np.searchsorted(sorted_starts, end_f[i] + max_gap, side="right")
        if hi <= lo:
            continue
        cand = order[lo:hi]
        cand = cand[cand != i]
        if cand.size == 0:
            continue
        ok = referee[cand] == referee[i]
        ok &= (team[cand] == 0) | (team[i] == 0) | (team[cand] == team[i])
        ratio = start_h[cand] / end_h[i]
        ok &= (ratio > 0.6) & (ratio < 1.6)
        dcol = np.linalg.norm(colour[cand] - colour[i], axis=1)
        ok &= np.isnan(dcol) | (dcol <= colour_gate)
        cand = cand[ok]
        if cand.size == 0:
            continue
        gap = (start_f[cand] - end_f[i]).astype(np.float64)
        reach = end_h[i] * (sprint_heights_per_s * gap / fps + 1.0)
        pred_fwd = end_c[i] + end_v[i] * gap[:, None]
        d_fwd = np.linalg.norm(start_c[cand] - pred_fwd, axis=1)
        pred_bwd = start_c[cand] - start_v[cand] * gap[:, None]
        d_bwd = np.linalg.norm(end_c[i] - pred_bwd, axis=1)
        cost = 0.5 * (d_fwd + d_bwd) / end_h[i] + 0.05 * (gap / fps)
        keep = (d_fwd <= reach) & (cost <= max_link_cost)
        if keep.any():
            rows_i.append(np.full(int(keep.sum()), i))
            rows_j.append(cand[keep])
            rows_c.append(cost[keep])
    if not rows_i:
        return {s.id: s.id + 1 for s in segments}, set(), 0

    I = np.concatenate(rows_i)
    J = np.concatenate(rows_j)
    C = np.concatenate(rows_c)
    E = len(I)

    # Affectation avec option « pas de lien » (gadget classique de suivi) :
    #   lignes   = fins de segment (0..n-1) + lignes fictives (n..2n-1)
    #   colonnes = débuts de segment (0..n-1) + colonnes fictives (n..2n-1)
    skip = max_link_cost / 2.0
    eps = 1e-6
    rows = np.concatenate([I, np.arange(n), n + np.arange(n), n + J])
    cols = np.concatenate([J, n + np.arange(n), np.arange(n), n + I])
    vals = np.concatenate([C + eps, np.full(n, skip), np.full(n, skip), np.full(E, eps)])
    matrix = coo_matrix((vals, (rows, cols)), shape=(2 * n, 2 * n)).tocsr()
    row_ind, col_ind = min_weight_full_bipartite_matching(matrix)
    links = {int(a): int(b) for a, b in zip(row_ind, col_ind) if a < n and b < n}

    cost_of = {(int(i), int(j)): float(c) for i, j, c in zip(I, J, C)}
    by_row: dict[int, list[tuple[float, int]]] = defaultdict(list)
    by_col: dict[int, list[tuple[float, int]]] = defaultdict(list)
    for (i, j), c in cost_of.items():
        by_row[i].append((c, j))
        by_col[j].append((c, i))
    ambiguous: set[int] = set()
    for a, b in links.items():
        c_ab = cost_of[(a, b)]
        rivals = [c for c, j in by_row[a] if j != b] + [c for c, i in by_col[b] if i != a]
        if rivals and min(rivals) - c_ab < ambiguity_margin:
            ambiguous.add(segments[b].id)

    has_pred = set(links.values())
    mapping: dict[int, int] = {}
    gid = 1                                  # identités globales numérotées à partir de 1 (0 = ballon, -1 = inconnue)
    for i in range(n):
        if i in has_pred:
            continue
        k: Optional[int] = i
        while k is not None:
            mapping[segments[k].id] = gid
            k = links.get(k)
        gid += 1
    return mapping, ambiguous, len(links)


# ---------------------------------------------------------------------------
# 4. Identités par ligne
# ---------------------------------------------------------------------------

def resolve_identities(
    frames: Sequence[np.ndarray],
    row_segments: Sequence[np.ndarray],
    mapping: dict[int, int],
    ambiguous_segments: set[int],
    max_fallback_frames: int = 38,
) -> tuple[list[np.ndarray], list[np.ndarray]]:
    """Identité globale de chaque ligne.

    Une ligne en contact (hors segment) reprend l'identité de la même piste
    d'origine juste avant (ou, à défaut, juste après), marquée incertaine.
    """
    T = len(frames)
    gids = [np.full(len(rs), -1, dtype=np.int64) for rs in row_segments]
    uncertain = [np.zeros(len(rs), dtype=bool) for rs in row_segments]
    last: dict[int, tuple[int, int]] = {}
    for f in range(T):
        arr = frames[f]
        for k, s in enumerate(row_segments[f]):
            tid = int(arr[k, COL_TID])
            if s >= 0:
                g = mapping[int(s)]
                last[tid] = (g, f)
                gids[f][k] = g
                uncertain[f][k] = int(s) in ambiguous_segments
            elif tid in last and f - last[tid][1] <= max_fallback_frames:
                gids[f][k] = last[tid][0]
                uncertain[f][k] = True
    nxt: dict[int, tuple[int, int]] = {}
    for f in range(T - 1, -1, -1):
        arr = frames[f]
        for k, s in enumerate(row_segments[f]):
            tid = int(arr[k, COL_TID])
            if s >= 0:
                nxt[tid] = (int(gids[f][k]), f)
            elif gids[f][k] < 0 and tid in nxt and nxt[tid][1] - f <= max_fallback_frames:
                gids[f][k] = nxt[tid][0]
                uncertain[f][k] = True
    # Une identité ne peut apparaître qu'une fois par frame : on garde la ligne la plus fiable.
    for f in range(T):
        g = gids[f]
        if len(g) < 2:
            continue
        valid = np.flatnonzero(g >= 0)
        seen: dict[int, int] = {}
        for k in valid:
            key = int(g[k])
            if key in seen:
                other = seen[key]
                if uncertain[f][other] and not uncertain[f][k]:
                    g[other] = -1
                    seen[key] = int(k)
                else:
                    g[k] = -1
            else:
                seen[key] = int(k)
    return gids, uncertain


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------

def stabilise_tracks(
    frames: Sequence[np.ndarray],
    fps: float,
    contact_iou: float = 0.2,
    min_segment_len: int = 3,
    split_gap_s: float = 1.0,
    max_gap_s: float = 4.0,
    max_step_heights: float = 0.6,
    **link_params,
) -> StabilisedTracks:
    segments, row_segments = build_segments(
        frames,
        contact_iou=contact_iou,
        min_len=min_segment_len,
        split_gap_frames=max(1, int(round(split_gap_s * fps))),
        max_step_heights=max_step_heights,
    )
    assign_segment_teams(segments)
    mapping, ambiguous, n_links = link_segments(segments, fps, max_gap_s=max_gap_s, **link_params)
    gids, uncertain = resolve_identities(
        frames, row_segments, mapping, ambiguous,
        max_fallback_frames=int(round(1.5 * fps)),
    )
    votes: dict[int, dict[int, float]] = defaultdict(lambda: defaultdict(float))
    for s in segments:
        if s.team:
            votes[mapping[s.id]][s.team] += len(s.frames)
    team_by_gid = {g: max(v, key=v.get) for g, v in votes.items()}
    return StabilisedTracks(
        segments=segments,
        row_segments=row_segments,
        mapping=mapping,
        ambiguous_segments=ambiguous,
        gids=gids,
        uncertain=uncertain,
        team_by_gid=team_by_gid,
        n_links=n_links,
    )
