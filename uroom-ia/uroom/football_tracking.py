"""YOLO + BoT-SORT video tracking for football match footage.

Deux étapes :

1. **Détection + tracking en ligne** (une passe YOLO).
   * Le ballon est capté AVANT le tracker (callback ``on_predict_postprocess_end``) et
     retiré de son entrée : un objet minuscule et fugitif n'a rien à faire dans un
     filtre de Kalman, et le tracker masque les nouvelles pistes jusqu'à leur
     confirmation, ce qui perd les détections isolées du ballon.
   * Les détections de joueurs / arbitres sont conservées brutes, par frame
     (boîte, rôle, couleur de maillot échantillonnée).

2. **Post-traitement hors-ligne** (voir match_analysis.py) : découpe des pistes aux
   contacts, recollage global, trajectoire du ballon, touches, passes. Puis on écrit
   ``track_frames.ndjson`` (identités stabilisées) et on rend ``annotated.mp4`` avec
   ces mêmes identités. Les détections brutes sont sauvegardées dans
   ``raw_detections.npz`` pour rejouer l'analyse (replay_analysis.py).

Le format de sortie reste compatible avec l'ancienne version ; des champs ont été
ajoutés (``activeSeconds``, ``touches``, ``passesUncertain``, ``uncertainFraction``,
``ball``, ``quality``).
"""

import json
import os
import subprocess
import threading
from pathlib import Path
from typing import Optional

import numpy as np

from .football_analytics import jersey_colour
from .match_analysis import MatchAnalysis, analyse_match, save_raw_detections
from .tracklets import (
    COL_ROLE,
    COL_TID,
    COL_X1,
    COL_X2,
    COL_Y1,
    COL_Y2,
    ROLE_PERSON,
    ROLE_PLAYER,
    ROLE_REFEREE,
)

BALL_TRACK_ID = 0
_ROLE_CODES = {"player": ROLE_PLAYER, "person": ROLE_PERSON, "referee": ROLE_REFEREE}
_ROLE_NAMES = {code: name for name, code in _ROLE_CODES.items()}
_TEAM_COLOURS = {1: (96, 238, 196), 2: (255, 170, 80), 0: (0, 210, 255)}   # BGR
_REFEREE_COLOUR = (180, 180, 180)


class AnalysisCancelled(Exception):
    pass


def _football_role(label: str) -> str:
    normalized = label.lower().replace("_", " ")
    if "ball" in normalized:
        return "ball"
    if "referee" in normalized or "official" in normalized:
        return "referee"
    if normalized == "person":
        return "person"
    if "player" in normalized or "goalkeeper" in normalized:
        return "player"
    return normalized


def _make_ball_capture(ball_log: list):
    """Callback exécuté AVANT le tracker : sort le ballon de ses entrées.

    Ajoute une entrée à ``ball_log`` par frame : tableau (m, 5) [x1, y1, x2, y2, conf]
    ou None. Le callback doit être enregistré avant ``model.track(...)`` pour passer
    avant celui du tracker.
    """
    state: dict = {"ids": None}

    def on_postprocess_end(predictor) -> None:
        for i, result in enumerate(predictor.results):
            entry = None
            boxes = result.boxes
            if boxes is not None and len(boxes):
                if state["ids"] is None:
                    state["ids"] = np.array(
                        [cid for cid, name in result.names.items() if _football_role(str(name)) == "ball"],
                        dtype=np.int64,
                    )
                cls = boxes.cls.int().cpu().numpy()
                is_ball = np.isin(cls, state["ids"])
                if is_ball.any():
                    xyxy = boxes.xyxy.cpu().numpy()
                    conf = boxes.conf.cpu().numpy()
                    entry = np.column_stack((xyxy[is_ball], conf[is_ball])).astype(np.float32)
                    try:
                        keep = np.flatnonzero(~is_ball)
                        predictor.results[i] = result[keep] if keep.size else result[:0]
                    except Exception:  # noqa: BLE001 — version d'Ultralytics différente : le ballon restera aussi dans le tracker
                        pass
            ball_log.append(entry)

    return on_postprocess_end


def _frame_rows(result, frame_index: int, sample_interval: int):
    """Lignes [tid, x1, y1, x2, y2, role, b, g, r] des pistes d'une frame + ballon de secours."""
    rows = []
    fallback_ball = []
    boxes = result.boxes
    if boxes is not None and boxes.id is not None:
        track_ids = boxes.id.int().cpu().tolist()
        class_ids = boxes.cls.int().cpu().tolist()
        confidences = boxes.conf.cpu().tolist()
        coordinates = boxes.xyxy.cpu().tolist()
        sample = frame_index % sample_interval == 0
        for track_id, class_id, conf, box in zip(track_ids, class_ids, confidences, coordinates):
            role = _football_role(str(result.names[int(class_id)]))
            if role == "ball":                      # n'arrive que si le callback a échoué
                fallback_ball.append([*box, conf])
                continue
            if role not in _ROLE_CODES:
                continue
            colour = (np.nan, np.nan, np.nan)
            if sample and role != "referee":
                measured = jersey_colour(result.orig_img, box)
                if measured is not None:
                    colour = tuple(float(v) for v in measured)
            rows.append([track_id, *box, _ROLE_CODES[role], *colour])
    array = np.asarray(rows, dtype=np.float32).reshape(-1, 9)
    ball = np.asarray(fallback_ball, dtype=np.float32).reshape(-1, 5) if fallback_ball else None
    return array, ball


def _start_encoder(imageio_ffmpeg, output_path: Path, width: int, height: int, fps: float):
    encoder = subprocess.Popen(
        [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-y",
            "-loglevel", "error",
            "-f", "rawvideo",
            "-vcodec", "rawvideo",
            "-pix_fmt", "bgr24",
            "-s:v", f"{width}x{height}",
            "-r", str(fps),
            "-i", "-",
            "-an",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(output_path),
        ],
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if encoder.stdin is None:
        raise RuntimeError("Unable to open the annotated video encoder")
    return encoder


def _write_track_frames(path: Path, index_path: Path, frames, analysis: MatchAnalysis) -> None:
    offsets = []
    with path.open("wb") as stream:
        for f, arr in enumerate(frames):
            if f % 300 == 0:
                offsets.append([f, stream.tell()])
            gids = analysis.frame_gids[f]
            detections = []
            for k in range(len(arr)):
                if gids[k] < 0:
                    continue
                x1, y1, x2, y2 = (int(round(v)) for v in arr[k, COL_X1:COL_Y2 + 1])
                detections.append([int(gids[k]), _ROLE_NAMES[int(arr[k, COL_ROLE])], x1, y1, x2, y2])
            if analysis.ball_valid[f]:
                cx, cy = analysis.ball_xy[f]
                detections.append([BALL_TRACK_ID, "ball", int(cx - 6), int(cy - 6), int(cx + 6), int(cy + 6)])
            line = json.dumps({"frame": f, "detections": detections}, separators=(",", ":"))
            stream.write(f"{line}\n".encode("utf-8"))
    index_path.write_text(json.dumps(offsets), encoding="utf-8")


def _render_annotated(
    cv2,
    imageio_ffmpeg,
    video_path: Path,
    output_path: Path,
    fps: float,
    frames,
    analysis: MatchAnalysis,
    cancel_event: Optional[threading.Event],
) -> int:
    """Deuxième lecture de la vidéo : dessine les identités STABILISÉES (pas celles du tracker)."""
    capture = cv2.VideoCapture(str(video_path))
    encoder = None
    touch_frames = {t.frame: t for t in analysis.touches if t.gid is not None}
    written = 0
    try:
        for f, arr in enumerate(frames):
            if cancel_event and cancel_event.is_set():
                raise AnalysisCancelled
            ok, image = capture.read()
            if not ok:
                break
            gids = analysis.frame_gids[f]
            for k in range(len(arr)):
                gid = int(gids[k])
                if gid < 0:
                    continue
                left, top, right, bottom = (int(round(v)) for v in arr[k, COL_X1:COL_Y2 + 1])
                is_referee = int(arr[k, COL_ROLE]) == ROLE_REFEREE
                colour = _REFEREE_COLOUR if is_referee else _TEAM_COLOURS[analysis.stabilised.team_by_gid.get(gid, 0)]
                cv2.rectangle(image, (left, top), (right, bottom), colour, 2)
                if is_referee:
                    continue
                uncertain = bool(analysis.stabilised.uncertain[f][k])
                marker = f"#{gid}?" if uncertain else f"#{gid}"
                (marker_width, marker_height), baseline = cv2.getTextSize(marker, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
                label_top = max(0, top - marker_height - baseline - 8)
                cv2.rectangle(image, (left, label_top), (left + marker_width + 10, top), colour, -1)
                cv2.putText(image, marker, (left + 5, top - baseline - 3),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 32, 29), 2, cv2.LINE_AA)
            if analysis.ball_valid[f]:
                centre = (int(analysis.ball_xy[f][0]), int(analysis.ball_xy[f][1]))
                cv2.circle(image, centre, 7, (255, 255, 255), 2 if analysis.ball_observed[f] else 1)
                for offset in range(0, 8):                  # anneau jaune juste après une touche
                    touch = touch_frames.get(f - offset)
                    if touch is not None:
                        ring = (0, 220, 255) if touch.quality == "clear" else (0, 140, 255)
                        cv2.circle(image, centre, 14 + offset, ring, 2)
                        break
            if encoder is None:
                height, width = image.shape[:2]
                encoder = _start_encoder(imageio_ffmpeg, output_path, width, height, fps)
            if encoder.stdin is None:
                raise RuntimeError("The annotated video encoder closed its input")
            encoder.stdin.write(image.tobytes())
            written += 1
        if encoder is not None:
            if encoder.stdin is not None:
                encoder.stdin.close()
            return_code = encoder.wait()
            encoder = None
            if return_code != 0:
                raise RuntimeError("FFmpeg could not encode the annotated preview")
    finally:
        capture.release()
        if encoder is not None:
            if encoder.poll() is None:
                encoder.kill()
            encoder.wait()
    return written


def analyze_video(video_path: Path, cancel_event: Optional[threading.Event] = None) -> dict:
    try:
        import cv2
        import imageio_ffmpeg
        from ultralytics import YOLO
    except ImportError as error:
        raise RuntimeError(
            "Video tracking dependencies are missing; install uroom-ia/requirements.txt"
        ) from error

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError("The uploaded file could not be opened as a video")
    fps = capture.get(cv2.CAP_PROP_FPS)
    capture.release()
    if not fps or fps <= 0:
        fps = 25.0

    model_path = os.getenv("UROOM_YOLO_MODEL", "yolo11l.pt")
    # Wide (Veo) footage shrinks the ball to ~10px; a larger inference size keeps it detectable.
    image_size = int(os.getenv("UROOM_YOLO_IMGSZ", "1280"))
    # Seuil bas : le ballon est souvent à 0,05–0,2 de confiance. Le tracker ignore de
    # lui-même les détections sous track_low_thresh, donc les joueurs ne sont pas pollués.
    confidence = float(os.getenv("UROOM_YOLO_CONF", "0.05"))
    model = YOLO(model_path)

    ball_log: list = []
    model.add_callback("on_predict_postprocess_end", _make_ball_capture(ball_log))

    sample_interval = max(1, int(round(fps / 2)))
    frames: list[np.ndarray] = []
    fallback_balls: list = []

    annotated_video_path = video_path.with_name("annotated.mp4")
    track_frames_path = video_path.with_name("track_frames.ndjson")
    track_frame_index_path = video_path.with_name("track_frames.index.json")

    try:
        for frame_index, result in enumerate(model.track(
            source=str(video_path),
            tracker=str(Path(__file__).with_name("botsort_football.yaml")),
            persist=True,
            stream=True,
            verbose=False,
            imgsz=image_size,
            conf=confidence,
        )):
            if cancel_event and cancel_event.is_set():
                raise AnalysisCancelled
            rows, fallback = _frame_rows(result, frame_index, sample_interval)
            frames.append(rows)
            fallback_balls.append(fallback)

        if not frames:
            raise ValueError("The annotated video could not be generated")

        ball_candidates = [
            ball_log[i] if i < len(ball_log) and ball_log[i] is not None else fallback_balls[i]
            for i in range(len(frames))
        ]
        # Sauvegarde AVANT l'analyse : on pourra la rejouer (replay_analysis.py) avec d'autres
        # seuils en quelques secondes, sans relancer YOLO, même si l'analyse échoue.
        save_raw_detections(video_path.with_name("raw_detections.npz"), frames, ball_candidates, fps)
        analysis = analyse_match(frames, ball_candidates, fps)

        _write_track_frames(track_frames_path, track_frame_index_path, frames, analysis)
        rendered = _render_annotated(
            cv2, imageio_ffmpeg, video_path, annotated_video_path, fps, frames, analysis, cancel_event
        )
        if not rendered or not annotated_video_path.is_file():
            raise ValueError("The annotated video could not be generated")
    except Exception:
        track_frames_path.unlink(missing_ok=True)
        track_frame_index_path.unlink(missing_ok=True)
        annotated_video_path.unlink(missing_ok=True)
        raise

    tracks = analysis.track_summaries()
    observed = int(analysis.ball_observed.sum())
    if observed:
        indices = np.flatnonzero(analysis.ball_observed)
        tracks.append({
            "trackId": BALL_TRACK_ID,
            "class": "ball",
            "detections": observed,
            "firstFrame": int(indices[0]),
            "lastFrame": int(indices[-1]),
            "visibleSeconds": round((int(indices[-1]) - int(indices[0]) + 1) / fps, 2),
        })

    players = [t for t in tracks if t["class"] in {"player", "person"}]
    return {
        "processedFrames": len(frames),
        "fps": fps,
        "tracks": sorted(tracks, key=lambda track: track["trackId"]),
        "annotatedVideoAvailable": True,
        "trackFramesAvailable": True,
        "ball": {
            "observedFrames": observed,
            "validFrames": int(analysis.ball_valid.sum()),
            "coverage": round(observed / len(frames), 4),
            "touches": len(analysis.touches),
            "touchesContested": sum(1 for t in analysis.touches if t.quality == "contested"),
            "touchesUnattributed": sum(1 for t in analysis.touches if t.quality == "none"),
        },
        "passEvents": analysis.pass_events,
        "diagnostics": analysis.diagnostics(),
        "quality": {
            "rawTrackIds": analysis.raw_track_count,
            "stableIdentities": len(players),
            "ambiguousLinks": len(analysis.stabilised.ambiguous_segments),
            "playerHeightPx": round(analysis.player_height, 1),
        },
    }