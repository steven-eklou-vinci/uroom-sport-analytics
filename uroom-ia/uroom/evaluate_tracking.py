"""Mesure la qualité du tracking (IDF1, ID switches) contre une vérité terrain.

Pourquoi : sans mesure, on règle les seuils à l'aveugle. Annote à la main 2 ou 3
clips de 60 s (CVAT, export « MOT 1.1 »), puis compare AVANT / APRÈS chaque
modification de la config ou du post-traitement.

Usage :

    python -m uroom.evaluate_tracking --gt gt.txt \
        --pred avant/track_frames.ndjson apres/track_frames.ndjson \
        --start 0 --end 1500

* ``gt.txt``  : format MOTChallenge  ``frame,id,x,y,w,h,...`` (frame 1-based par défaut,
  voir ``--gt-frame-offset``).
* ``--pred``  : un ou plusieurs ``track_frames.ndjson`` produits par analyze_video.
  Seuls les rôles « player » et « person » sont comparés (pas le ballon ni l'arbitre).

Métriques :
  IDF1        qualité d'identité sur toute la durée (1.0 = parfait)
  IDSW        nombre de changements d'identité d'un joueur de la vérité terrain
  Rappel / Précision de détection (IoU >= 0.5)
  Fragments   nombre d'identités prédites / nombre d'identités réelles
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Mapping, Optional

import numpy as np
from scipy.optimize import linear_sum_assignment

Frames = Mapping[int, tuple[np.ndarray, np.ndarray]]


def load_mot(path: str, frame_offset: int = 1) -> dict[int, tuple[np.ndarray, np.ndarray]]:
    """Vérité terrain MOT : frame,id,x,y,w,h,... -> {frame0: (ids, boxes xyxy)}."""
    data = np.loadtxt(path, delimiter=",", ndmin=2)
    out: dict[int, list] = defaultdict(lambda: [[], []])
    for row in data:
        frame = int(row[0]) - frame_offset
        x, y, w, h = row[2:6]
        out[frame][0].append(int(row[1]))
        out[frame][1].append([x, y, x + w, y + h])
    return {f: (np.array(ids), np.array(boxes, dtype=float)) for f, (ids, boxes) in out.items()}


def load_ndjson(path: str, roles=("player", "person")) -> dict[int, tuple[np.ndarray, np.ndarray]]:
    """track_frames.ndjson -> {frame: (ids, boxes xyxy)} (joueurs seulement)."""
    out: dict[int, tuple[np.ndarray, np.ndarray]] = {}
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            ids, boxes = [], []
            for track_id, role, x1, y1, x2, y2 in record["detections"]:
                if role in roles:
                    ids.append(int(track_id))
                    boxes.append([x1, y1, x2, y2])
            if ids:
                out[int(record["frame"])] = (np.array(ids), np.array(boxes, dtype=float))
    return out


def _iou(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    x1 = np.maximum(a[:, None, 0], b[None, :, 0])
    y1 = np.maximum(a[:, None, 1], b[None, :, 1])
    x2 = np.minimum(a[:, None, 2], b[None, :, 2])
    y2 = np.minimum(a[:, None, 3], b[None, :, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    area_a = (a[:, 2] - a[:, 0]) * (a[:, 3] - a[:, 1])
    area_b = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1])
    union = area_a[:, None] + area_b[None, :] - inter
    return np.where(union > 0, inter / np.where(union > 0, union, 1), 0.0)


def evaluate(
    gt: Frames,
    pred: Frames,
    iou_threshold: float = 0.5,
    start: Optional[int] = None,
    end: Optional[int] = None,
) -> dict:
    empty = (np.empty(0, dtype=int), np.empty((0, 4)))
    frames = sorted(set(gt) | set(pred))
    if start is not None:
        frames = [f for f in frames if f >= start]
    if end is not None:
        frames = [f for f in frames if f <= end]

    pair_counts: dict[tuple[int, int], int] = defaultdict(int)
    gt_total = pred_total = matches = id_switches = 0
    last_pred_for_gt: dict[int, int] = {}
    gt_ids_seen: set[int] = set()
    pred_ids_seen: set[int] = set()

    for f in frames:
        g_ids, g_boxes = gt.get(f, empty)
        p_ids, p_boxes = pred.get(f, empty)
        gt_total += len(g_ids)
        pred_total += len(p_ids)
        gt_ids_seen.update(int(i) for i in g_ids)
        pred_ids_seen.update(int(i) for i in p_ids)
        if not len(g_ids) or not len(p_ids):
            continue
        iou = _iou(g_boxes, p_boxes)
        good = iou >= iou_threshold
        for a, b in zip(*np.nonzero(good)):
            pair_counts[(int(g_ids[a]), int(p_ids[b]))] += 1
        rows, cols = linear_sum_assignment(-(iou * good))
        for a, b in zip(rows, cols):
            if not good[a, b]:
                continue
            matches += 1
            gid, pid = int(g_ids[a]), int(p_ids[b])
            if gid in last_pred_for_gt and last_pred_for_gt[gid] != pid:
                id_switches += 1
            last_pred_for_gt[gid] = pid

    gt_list, pred_list = sorted(gt_ids_seen), sorted(pred_ids_seen)
    idtp = 0
    if gt_list and pred_list:
        g_index = {g: i for i, g in enumerate(gt_list)}
        p_index = {p: i for i, p in enumerate(pred_list)}
        table = np.zeros((len(gt_list), len(pred_list)))
        for (g, p), n in pair_counts.items():
            table[g_index[g], p_index[p]] = n
        rows, cols = linear_sum_assignment(-table)
        idtp = int(table[rows, cols].sum())
    idtp = min(idtp, gt_total, pred_total)
    idfn, idfp = gt_total - idtp, pred_total - idtp
    denominator = 2 * idtp + idfp + idfn
    return {
        "idf1": (2 * idtp / denominator) if denominator else 0.0,
        "id_switches": id_switches,
        "recall": matches / gt_total if gt_total else 0.0,
        "precision": matches / pred_total if pred_total else 0.0,
        "gt_ids": len(gt_list),
        "pred_ids": len(pred_list),
        "fragmentation": (len(pred_list) / len(gt_list)) if gt_list else 0.0,
        "gt_detections": gt_total,
        "pred_detections": pred_total,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--gt", required=True, help="vérité terrain MOT (gt.txt)")
    parser.add_argument("--pred", required=True, nargs="+", help="un ou plusieurs track_frames.ndjson")
    parser.add_argument("--gt-frame-offset", type=int, default=1, help="1 si les frames du GT commencent à 1 (CVAT)")
    parser.add_argument("--start", type=int, default=None)
    parser.add_argument("--end", type=int, default=None)
    parser.add_argument("--iou", type=float, default=0.5)
    args = parser.parse_args()

    gt = load_mot(args.gt, args.gt_frame_offset)
    header = f"{'prédiction':<42}{'IDF1':>7}{'IDSW':>6}{'rappel':>8}{'préc.':>7}{'ids GT':>8}{'ids préd.':>10}"
    print(header)
    print("-" * len(header))
    for path in args.pred:
        report = evaluate(gt, load_ndjson(path), args.iou, args.start, args.end)
        name = str(Path(path).parent.name + "/" + Path(path).name)[-40:]
        print(f"{name:<42}{report['idf1']:>7.3f}{report['id_switches']:>6d}"
              f"{report['recall']:>8.3f}{report['precision']:>7.3f}"
              f"{report['gt_ids']:>8d}{report['pred_ids']:>10d}")


if __name__ == "__main__":
    main()
