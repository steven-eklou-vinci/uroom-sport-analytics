"""YOLO + ByteTrack video tracking for football match footage."""

import os
import json
import subprocess
import threading
from collections import Counter
from pathlib import Path
from typing import Optional


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
    model = YOLO(model_path)
    tracks = {}
    processed_frames = 0
    annotated_video_path = video_path.with_name("annotated.mp4")
    track_frames_path = video_path.with_name("track_frames.ndjson")
    track_frame_index_path = video_path.with_name("track_frames.index.json")
    video_encoder = None
    track_frames_stream = None
    frame_offsets = []

    try:
        track_frames_stream = track_frames_path.open("wb")
        for frame_index, result in enumerate(model.track(
            source=str(video_path),
            tracker=str(Path(__file__).with_name("botsort_football.yaml")),
            persist=True,
            stream=True,
            verbose=False,
        )):
            if cancel_event and cancel_event.is_set():
                raise AnalysisCancelled
            processed_frames = frame_index + 1
            annotated_frame = result.orig_img.copy()
            frame_detections = []
            boxes = result.boxes
            if boxes is not None and boxes.id is not None:
                track_ids = boxes.id.int().cpu().tolist()
                class_ids = boxes.cls.int().cpu().tolist()
                coordinates = boxes.xyxy.int().cpu().tolist()
                for track_id, class_id, box in zip(track_ids, class_ids, coordinates):
                    label = result.names[int(class_id)]
                    role = _football_role(str(label))
                    if role not in {"player", "person", "referee", "ball"}:
                        continue
                    track = tracks.setdefault(track_id, {
                        "trackId": track_id,
                        "classCounts": Counter(),
                        "detections": 0,
                        "firstFrame": frame_index,
                        "lastFrame": frame_index,
                    })
                    track["classCounts"][role] += 1
                    track["detections"] += 1
                    track["lastFrame"] = frame_index
                    frame_detections.append([int(track_id), role, *box])

                    if role in {"player", "person"}:
                        left, top, right, bottom = box
                        marker_color = (96, 238, 196) if role == "player" else (0, 210, 255)
                        cv2.rectangle(annotated_frame, (left, top), (right, bottom), marker_color, 2)
                        marker = f"#{track_id}" if role == "player" else f"#{track_id}?"
                        (marker_width, marker_height), baseline = cv2.getTextSize(
                            marker,
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.65,
                            2,
                        )
                        label_top = max(0, top - marker_height - baseline - 8)
                        cv2.rectangle(
                            annotated_frame,
                            (left, label_top),
                            (left + marker_width + 10, top),
                            marker_color,
                            -1,
                        )
                        cv2.putText(
                            annotated_frame,
                            marker,
                            (left + 5, top - baseline - 3),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.65,
                            (20, 32, 29),
                            2,
                            cv2.LINE_AA,
                        )

            if track_frames_stream is None:
                raise RuntimeError("Unable to write per-frame tracking data")
            if frame_index % 300 == 0:
                frame_offsets.append([frame_index, track_frames_stream.tell()])
            line = json.dumps(
                {"frame": frame_index, "detections": frame_detections},
                separators=(",", ":"),
            )
            track_frames_stream.write(f"{line}\n".encode("utf-8"))

            if video_encoder is None:
                frame_height, frame_width = annotated_frame.shape[:2]
                video_encoder = subprocess.Popen(
                    [
                        imageio_ffmpeg.get_ffmpeg_exe(),
                        "-y",
                        "-loglevel", "error",
                        "-f", "rawvideo",
                        "-vcodec", "rawvideo",
                        "-pix_fmt", "bgr24",
                        "-s:v", f"{frame_width}x{frame_height}",
                        "-r", str(fps),
                        "-i", "-",
                        "-an",
                        "-c:v", "libx264",
                        "-preset", "veryfast",
                        "-crf", "23",
                        "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart",
                        str(annotated_video_path),
                    ],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                if video_encoder.stdin is None:
                    raise RuntimeError("Unable to open the annotated video encoder")
            if video_encoder.stdin is None:
                raise RuntimeError("The annotated video encoder closed its input")
            video_encoder.stdin.write(annotated_frame.tobytes())

        if video_encoder is not None:
            if video_encoder.stdin is not None:
                video_encoder.stdin.close()
            return_code = video_encoder.wait()
            video_encoder = None
            if return_code != 0:
                raise RuntimeError("FFmpeg could not encode the annotated preview")
        if track_frames_stream is not None:
            track_frames_stream.close()
            track_frames_stream = None
        track_frame_index_path.write_text(json.dumps(frame_offsets), encoding="utf-8")
    except Exception:
        if track_frames_stream is not None:
            track_frames_stream.close()
        track_frames_path.unlink(missing_ok=True)
        track_frame_index_path.unlink(missing_ok=True)
        if video_encoder is not None:
            if video_encoder.poll() is None:
                video_encoder.kill()
            video_encoder.wait()
        annotated_video_path.unlink(missing_ok=True)
        raise

    if not processed_frames or not annotated_video_path.is_file():
        annotated_video_path.unlink(missing_ok=True)
        track_frames_path.unlink(missing_ok=True)
        track_frame_index_path.unlink(missing_ok=True)
        raise ValueError("The annotated video could not be generated")

    player_tracks = []
    for track in tracks.values():
        role = track["classCounts"].most_common(1)[0][0]
        first_frame = track["firstFrame"]
        last_frame = track["lastFrame"]
        player_tracks.append({
            "trackId": track["trackId"],
            "class": role,
            "detections": track["detections"],
            "firstFrame": first_frame,
            "lastFrame": last_frame,
            "visibleSeconds": round((last_frame - first_frame + 1) / fps, 2),
        })

    return {
        "processedFrames": processed_frames,
        "fps": fps,
        "tracks": sorted(player_tracks, key=lambda track: track["trackId"]),
        "annotatedVideoAvailable": True,
        "trackFramesAvailable": True,
    }