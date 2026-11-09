"""
api/main.py
API FastAPI — expose le modèle Uroom au backend Node.js

Endpoints :
    POST /predict          → score ML + radar + projections pour un joueur
    POST /predict/batch    → scores pour plusieurs joueurs
    GET  /player/{id}      → profil complet avec historique
    GET  /health           → vérification que l'API tourne

Démarrage :
    cd uroom-ia
    uvicorn api.main:app --reload --port 8000

Depuis Node.js :
    const res = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: 'P0004', snapshots: [...] })
    })
"""

import pickle
import os
import re
import sys
import json
import shutil
import threading
import uuid
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

# Ajouter le dossier parent au path pour importer uroom
sys.path.insert(0, str(Path(__file__).parent.parent))

from uroom.features import build_feature_matrix, get_core_feature_columns
from uroom.radar    import radar_scores_for_api_v2
from uroom.data_loader import csv_to_players_snapshots
from uroom.football_tracking import AnalysisCancelled, analyze_video


# ---------------------------------------------------------------------------
# App FastAPI
# ---------------------------------------------------------------------------

app = FastAPI(
    title       = "Uroom Analytics API",
    description = "API de prédiction de potentiel pour jeunes joueurs de football",
    version     = "1.0.0",
)

# CORS — autorise les requêtes depuis ton frontend et Node.js
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],  # En prod : remplace par ton domaine
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ---------------------------------------------------------------------------
# Chargement du modèle au démarrage
# ---------------------------------------------------------------------------

MODEL_PATH = Path(__file__).parent.parent / "data" / "processed" / "uroom_model_v2.pkl"

pipeline      = None
used_features = None
threshold     = None
MATCH_ANALYSIS_ROOT = Path(os.getenv(
    "UROOM_MATCH_DATA_DIR",
    str(Path(__file__).parent.parent / "data" / "match_analyses"),
))
MAX_MATCH_UPLOAD_BYTES = int(os.getenv("UROOM_MAX_MATCH_UPLOAD_BYTES", str(10 * 1024**3)))
MATCH_JOB_CANCEL_EVENTS: dict[str, threading.Event] = {}


def require_service_token(x_uroom_service_token: Optional[str]):
    """Protect model endpoints in production while keeping local DX simple."""
    expected = os.getenv("IA_SERVICE_TOKEN", "").strip()
    if not expected:
        return
    if (x_uroom_service_token or "").strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid IA service token")

@app.on_event("startup")
async def load_model():
    global pipeline, used_features, threshold
    if not MODEL_PATH.exists():
        print(f"⚠️  Modèle introuvable : {MODEL_PATH}")
        return
    with open(MODEL_PATH, "rb") as f:
        model_data    = pickle.load(f)
    pipeline      = model_data["pipeline"]
    used_features = model_data["features"]
    threshold     = model_data.get("threshold", 0.50)
    print(f"✅ Modèle chargé — {len(used_features)} features, seuil {threshold:.2f}")


# ---------------------------------------------------------------------------
# Schémas Pydantic — format des requêtes depuis Node.js
# ---------------------------------------------------------------------------

class SnapshotInput(BaseModel):
    """Un snapshot d'un joueur à une saison donnée."""
    player_id:           str
    birth_date:          str           # "2010-05-15"
    position:            str           # "MID", "DEF", "FWD", "GK"
    dominant_foot:       str           # "right", "left", "both"
    nationality:         str = "BE"
    academy:             str = "Unknown"
    is_pro:              Optional[int] = None   # 1, 0, ou null si encore en formation

    snapshot_date:       str           # "2024-05-15"
    season:              str           # "2023-24"
    age:                 float
    competition_level:   int = 3       # 1=national élite → 5=district

    # Physique
    height_cm:           float = 0.0
    weight_kg:           float = 0.0
    sitting_height_cm:   float = 0.0
    sprint_10m_sec:      float = 0.0
    sprint_30m_sec:      float = 0.0
    jump_cm:             float = 0.0
    endurance_score:     float = 0.0

    # Technique
    matches_played:      int   = 0
    minutes_played:      int   = 0
    pass_accuracy_pct:   float = 0.0
    dribble_success_pct: float = 0.0
    shots_on_target_pct: float = 0.0
    duels_won_pct:       float = 0.0
    interceptions_per90: float = 0.0
    goals_per90:         float = 0.0
    assists_per90:       float = 0.0

    # Scout (optionnel)
    avg_scout_score:           Optional[float] = None
    scout_observation_count:   int = 0


class PredictRequest(BaseModel):
    """Requête de prédiction pour un joueur."""
    snapshots:   list[SnapshotInput]
    years_ahead: int = 4


class BatchPredictRequest(BaseModel):
    """Requête batch pour plusieurs joueurs."""
    players:     list[PredictRequest]
    years_ahead: int = 4


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def snapshots_to_dataframe(snapshots: list[SnapshotInput]) -> pd.DataFrame:
    """Convertit les SnapshotInput en DataFrame compatible avec notre pipeline."""
    rows = []
    for s in snapshots:
        rows.append({
            "player_id":               s.player_id,
            "birth_date":              s.birth_date,
            "position":                s.position,
            "dominant_foot":           s.dominant_foot,
            "nationality":             s.nationality,
            "academy":                 s.academy,
            "is_pro":                  s.is_pro,
            "first_name":              f"Player_{s.player_id[-3:]}",
            "last_name":               f"Family_{s.player_id[-2:]}",
            "snapshot_date":           s.snapshot_date,
            "season":                  s.season,
            "age":                     s.age,
            "competition_level":       s.competition_level,
            "height_cm":               s.height_cm,
            "weight_kg":               s.weight_kg,
            "sitting_height_cm":       s.sitting_height_cm,
            "sprint_10m_sec":          s.sprint_10m_sec,
            "sprint_30m_sec":          s.sprint_30m_sec,
            "jump_cm":                 s.jump_cm,
            "endurance_score":         s.endurance_score,
            "matches_played":          s.matches_played,
            "minutes_played":          s.minutes_played,
            "pass_accuracy_pct":       s.pass_accuracy_pct,
            "dribble_success_pct":     s.dribble_success_pct,
            "shots_on_target_pct":     s.shots_on_target_pct,
            "duels_won_pct":           s.duels_won_pct,
            "interceptions_per90":     s.interceptions_per90,
            "goals_per90":             s.goals_per90,
            "assists_per90":           s.assists_per90,
            "avg_scout_score":         s.avg_scout_score,
            "scout_observation_count": s.scout_observation_count,
        })
    return pd.DataFrame(rows)


def run_pipeline(df_raw: pd.DataFrame):
    """Lance le pipeline complet sur un DataFrame brut."""
    players, snapshots = csv_to_players_snapshots(df_raw)
    df = build_feature_matrix(
        snapshots,
        players,
        has_sitting_height = True,
        verbose            = False,
    )
    return df, players


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    """Vérifie que l'API et le modèle sont opérationnels."""
    return {
        "status":        "ok",
        "model_loaded":  pipeline is not None,
        "n_features":    len(used_features) if used_features else 0,
        "threshold":     threshold,
    }


def write_match_job_status(job_dir: Path, status: dict):
    temp_path = job_dir / "status.json.tmp"
    temp_path.write_text(json.dumps(status, ensure_ascii=False), encoding="utf-8")
    temp_path.replace(job_dir / "status.json")


def process_match_job(job_id: str, job_dir: Path, video_path: Path, cancel_event: threading.Event):
    try:
        if cancel_event.is_set():
            raise AnalysisCancelled
        write_match_job_status(job_dir, {
            "id": job_id,
            "status": "PROCESSING",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })
        result = analyze_video(video_path, cancel_event)
        if cancel_event.is_set():
            raise AnalysisCancelled
        write_match_job_status(job_dir, {
            "id": job_id,
            "status": "COMPLETED",
            "completedAt": datetime.now(timezone.utc).isoformat(),
            **result,
        })
    except AnalysisCancelled:
        write_match_job_status(job_dir, {
            "id": job_id,
            "status": "CANCELLED",
            "completedAt": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as error:
        job_status = "CANCELLED" if cancel_event.is_set() else "FAILED"
        status = {
            "id": job_id,
            "status": job_status,
            "completedAt": datetime.now(timezone.utc).isoformat(),
        }
        if job_status == "FAILED":
            status["error"] = str(error)
        write_match_job_status(job_dir, status)
    finally:
        video_path.unlink(missing_ok=True)
        MATCH_JOB_CANCEL_EVENTS.pop(job_id, None)


@app.post("/match/jobs", status_code=202)
async def create_match_job(
    background_tasks: BackgroundTasks,
    request: Request,
    x_video_filename: str = Header(...),
    x_uroom_service_token: Optional[str] = Header(default=None),
):
    require_service_token(x_uroom_service_token)
    extension = Path(x_video_filename).suffix.lower()
    if extension not in {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}:
        raise HTTPException(status_code=400, detail="Unsupported video format")

    job_id = str(uuid.uuid4())
    job_dir = MATCH_ANALYSIS_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=False)
    video_path = job_dir / f"source{extension}"
    uploaded_bytes = 0

    try:
        with video_path.open("wb") as destination:
            async for chunk in request.stream():
                uploaded_bytes += len(chunk)
                if uploaded_bytes > MAX_MATCH_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Video exceeds the upload limit")
                destination.write(chunk)
    except Exception:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise

    write_match_job_status(job_dir, {
        "id": job_id,
        "status": "QUEUED",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })
    cancel_event = threading.Event()
    MATCH_JOB_CANCEL_EVENTS[job_id] = cancel_event
    background_tasks.add_task(process_match_job, job_id, job_dir, video_path, cancel_event)
    return {"id": job_id, "status": "QUEUED"}


@app.get("/match/jobs/{job_id}")
async def get_match_job(
    job_id: str,
    x_uroom_service_token: Optional[str] = Header(default=None),
):
    require_service_token(x_uroom_service_token)
    try:
        safe_job_id = str(uuid.UUID(job_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Match analysis not found")

    status_path = MATCH_ANALYSIS_ROOT / safe_job_id / "status.json"
    if not status_path.is_file():
        raise HTTPException(status_code=404, detail="Match analysis not found")
    return json.loads(status_path.read_text(encoding="utf-8"))


@app.get("/match/jobs/{job_id}/frames")
async def get_match_track_frames(
    job_id: str,
    start_frame: int,
    end_frame: int,
    track_ids: str,
    x_uroom_service_token: Optional[str] = Header(default=None),
):
    require_service_token(x_uroom_service_token)
    try:
        safe_job_id = str(uuid.UUID(job_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Match analysis not found")
    if start_frame < 0 or end_frame < start_frame or end_frame - start_frame > 600:
        raise HTTPException(status_code=400, detail="Invalid frame window")

    job_dir = MATCH_ANALYSIS_ROOT / safe_job_id
    status_path = job_dir / "status.json"
    frame_path = job_dir / "track_frames.ndjson"
    index_path = job_dir / "track_frames.index.json"
    if not status_path.is_file() or not frame_path.is_file() or not index_path.is_file():
        raise HTTPException(status_code=404, detail="Track frame data not found")
    status = json.loads(status_path.read_text(encoding="utf-8"))
    if status.get("status") != "COMPLETED" or not status.get("trackFramesAvailable"):
        raise HTTPException(status_code=409, detail="Track frame data is not ready")

    try:
        requested_ids = {int(track_id) for track_id in track_ids.split(",") if track_id}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid track id")
    if not requested_ids:
        return {"frames": []}

    offsets = json.loads(index_path.read_text(encoding="utf-8"))
    start_offset = 0
    for indexed_frame, indexed_offset in offsets:
        if indexed_frame > start_frame:
            break
        start_offset = indexed_offset

    frames = []
    with frame_path.open("rb") as track_file:
        track_file.seek(start_offset)
        while line := track_file.readline():
            frame_data = json.loads(line)
            frame_number = frame_data["frame"]
            if frame_number > end_frame:
                break
            if frame_number < start_frame:
                continue
            detections = [
                detection
                for detection in frame_data["detections"]
                if detection[0] in requested_ids
            ]
            if detections:
                frames.append({"frame": frame_number, "detections": detections})
    return {"frames": frames}


def read_video_range(video_path: Path, start: int, end: int):
    with video_path.open("rb") as video_file:
        video_file.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = video_file.read(min(1024 * 1024, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


@app.api_route("/match/jobs/{job_id}/annotated", methods=["GET", "HEAD"])
async def get_annotated_match_video(
    job_id: str,
    request: Request,
    range_header: Optional[str] = Header(default=None, alias="Range"),
    x_uroom_service_token: Optional[str] = Header(default=None),
):
    require_service_token(x_uroom_service_token)
    try:
        safe_job_id = str(uuid.UUID(job_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Match analysis not found")

    job_dir = MATCH_ANALYSIS_ROOT / safe_job_id
    status_path = job_dir / "status.json"
    if not status_path.is_file():
        raise HTTPException(status_code=404, detail="Match analysis not found")
    status = json.loads(status_path.read_text(encoding="utf-8"))
    if status.get("status") != "COMPLETED" or not status.get("annotatedVideoAvailable"):
        raise HTTPException(status_code=404, detail="Annotated video not found")

    video_path = job_dir / "annotated.mp4"
    if not video_path.is_file():
        raise HTTPException(status_code=404, detail="Annotated video not found")
    file_size = video_path.stat().st_size
    base_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
    }

    if not range_header:
        base_headers["Content-Length"] = str(file_size)
        if request.method == "HEAD":
            return Response(status_code=200, media_type="video/mp4", headers=base_headers)
        return StreamingResponse(
            read_video_range(video_path, 0, file_size - 1),
            media_type="video/mp4",
            headers=base_headers,
        )

    range_match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
    if not range_match or (not range_match.group(1) and not range_match.group(2)):
        return Response(status_code=416, headers={"Content-Range": f"bytes */{file_size}"})

    if not range_match.group(1):
        suffix_length = int(range_match.group(2))
        start = max(file_size - suffix_length, 0)
        end = file_size - 1
    else:
        start = int(range_match.group(1))
        end = min(int(range_match.group(2)) if range_match.group(2) else file_size - 1, file_size - 1)

    if start >= file_size or start > end:
        return Response(status_code=416, headers={"Content-Range": f"bytes */{file_size}"})

    base_headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    base_headers["Content-Length"] = str(end - start + 1)
    if request.method == "HEAD":
        return Response(status_code=206, media_type="video/mp4", headers=base_headers)
    return StreamingResponse(
        read_video_range(video_path, start, end),
        status_code=206,
        media_type="video/mp4",
        headers=base_headers,
    )


@app.post("/match/jobs/{job_id}/cancel")
async def cancel_match_job(
    job_id: str,
    x_uroom_service_token: Optional[str] = Header(default=None),
):
    require_service_token(x_uroom_service_token)
    try:
        safe_job_id = str(uuid.UUID(job_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Match analysis not found")

    job_dir = MATCH_ANALYSIS_ROOT / safe_job_id
    status_path = job_dir / "status.json"
    if not status_path.is_file():
        raise HTTPException(status_code=404, detail="Match analysis not found")

    current_status = json.loads(status_path.read_text(encoding="utf-8"))
    if current_status.get("status") in {"COMPLETED", "FAILED", "CANCELLED"}:
        return current_status

    cancel_event = MATCH_JOB_CANCEL_EVENTS.get(safe_job_id)
    if cancel_event:
        cancel_event.set()
        cancelled_status = {
            "id": safe_job_id,
            "status": "CANCELLED",
            "completedAt": datetime.now(timezone.utc).isoformat(),
        }
        write_match_job_status(job_dir, cancelled_status)
        return cancelled_status

    for video_path in job_dir.glob("source.*"):
        video_path.unlink(missing_ok=True)
    cancelled_status = {
        "id": safe_job_id,
        "status": "CANCELLED",
        "completedAt": datetime.now(timezone.utc).isoformat(),
    }
    write_match_job_status(job_dir, cancelled_status)
    return cancelled_status


@app.post("/predict")
async def predict(request: PredictRequest, x_uroom_service_token: Optional[str] = Header(default=None)):
    """
    Prédit le potentiel d'un joueur et retourne son profil complet.

    Retourne :
    - potential_score    : score ML 0-100
    - verdict            : 🟢 / 🟡 / 🟠 / 🔴
    - score_reliability  : high / medium / low
    - radar              : scores 0-100 pour les 8 dimensions
    - projections        : évolution radar sur N années
    - scout_alert        : confirme / alerte / null
    """
    require_service_token(x_uroom_service_token)

    if pipeline is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé")

    if not request.snapshots:
        raise HTTPException(status_code=400, detail="Aucun snapshot fourni")

    try:
        # Convertir en DataFrame
        df_raw = snapshots_to_dataframe(request.snapshots)
        # In inference, we can receive null labels; force a neutral value to avoid
        # row removal in the feature pipeline that expects non-null is_pro.
        if "is_pro" in df_raw.columns:
            df_raw["is_pro"] = df_raw["is_pro"].fillna(0).astype(int)
        player_id = df_raw["player_id"].iloc[0]

        # Pipeline feature engineering
        df, players = run_pipeline(df_raw)

        if df.empty:
            raise HTTPException(status_code=422, detail="Impossible de calculer les features")

        # Score ML
        available = [c for c in used_features if c in df.columns]
        last_snap = df[df["player_id"] == player_id].sort_values("age").iloc[[-1]]
        ml_proba  = float(pipeline.predict_proba(last_snap[available].values)[0][1])
        ml_score  = round(ml_proba * 100, 1)

        # Verdict
        if ml_score >= 65:
            verdict = "🟢 Très prometteur"
        elif ml_score >= 50:
            verdict = "🟡 À surveiller"
        elif ml_score >= 35:
            verdict = "🟠 Incertain"
        else:
            verdict = "🔴 Éloigné profil pro"

        # Contexte scout
        score_reliability = str(last_snap["score_reliability"].iloc[0]) \
            if "score_reliability" in last_snap.columns else "unknown"
        scout_alert = last_snap["scout_alert"].iloc[0] \
            if "scout_alert" in last_snap.columns else None
        scout_coverage = int(last_snap["scout_coverage"].iloc[0]) \
            if "scout_coverage" in last_snap.columns else 0

        # Radar + projections
        radar_data = radar_scores_for_api_v2(
            player_id     = player_id,
            df            = df,
            pipeline      = pipeline,
            used_features = used_features,
            years_ahead   = request.years_ahead,
        )

        return {
            "player_id":        player_id,
            "potential_score":  ml_score,
            "verdict":          verdict,
            "score_reliability": score_reliability,
            "scout_alert":      scout_alert,
            "scout_coverage":   scout_coverage,
            "radar":            radar_data.get("current", {}).get("scores", {}),
            "radar_history":    radar_data.get("history", {}),
            "projections":      radar_data.get("projections", {}),
            "timeline":         radar_data.get("timeline", {}),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch")
async def predict_batch(request: BatchPredictRequest, x_uroom_service_token: Optional[str] = Header(default=None)):
    """
    Prédit le potentiel pour plusieurs joueurs en une seule requête.
    Utile pour afficher le classement d'une équipe.
    """
    require_service_token(x_uroom_service_token)

    if pipeline is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé")

    results = []
    for player_request in request.players:
        try:
            result = await predict(player_request)
            results.append(result)
        except Exception as e:
            results.append({
                "player_id": player_request.snapshots[0].player_id
                    if player_request.snapshots else "unknown",
                "error": str(e),
            })

    # Trier par potential_score décroissant
    results.sort(
        key     = lambda x: x.get("potential_score", 0),
        reverse = True,
    )

    return {
        "count":   len(results),
        "players": results,
    }


@app.post("/compare/team")
async def compare_team(request: BatchPredictRequest):
    """
    Génère le tableau de comparaison pour une équipe.
    Retourne un tableau trié par potential_score avec :
    Joueur | Statut | ML (%) | Mult. | Âge | Moy. actuelle | Moy. +4 ans | Gain total
    """
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé")

    rows = []

    for player_request in request.players:
        try:
            if not player_request.snapshots:
                continue

            df_raw    = snapshots_to_dataframe(player_request.snapshots)
            player_id = df_raw["player_id"].iloc[0]
            df, _     = run_pipeline(df_raw)

            if df.empty:
                continue

            # Score ML
            available = [c for c in used_features if c in df.columns]
            last_snap = df[df["player_id"] == player_id].sort_values("age").iloc[[-1]]
            ml_score  = round(float(pipeline.predict_proba(last_snap[available].values)[0][1]) * 100, 1)
            age       = round(float(last_snap["age"].iloc[0]), 1)

            # Radar + projections
            radar_data = radar_scores_for_api_v2(
                player_id     = player_id,
                df            = df,
                pipeline      = pipeline,
                used_features = used_features,
                years_ahead   = request.years_ahead,
            )

            current_scores = radar_data.get("current", {}).get("scores", {})
            moy_actuelle   = round(sum(current_scores.values()) / len(current_scores)) if current_scores else 0

            projections  = radar_data.get("projections", {})
            last_proj    = list(projections.values())[-1] if projections else {}
            last_scores  = last_proj.get("scores", {})
            moy_future   = round(sum(last_scores.values()) / len(last_scores)) if last_scores else 0
            gain_total   = moy_future - moy_actuelle
            mult         = round(list(projections.values())[0].get("potential_multiplier", 1.0), 2) if projections else 1.0

            # Verdict
            if ml_score >= 65:
                verdict = "🟢 Très prometteur"
            elif ml_score >= 50:
                verdict = "🟡 À surveiller"
            elif ml_score >= 35:
                verdict = "🟠 Incertain"
            else:
                verdict = "🔴 Éloigné profil pro"

            rows.append({
                "player_id":      player_id,
                "ml_score":       ml_score,
                "verdict":        verdict,
                "multiplier":     mult,
                "age":            age,
                "avg_current":    moy_actuelle,
                "avg_future":     moy_future,
                "gain_total":     gain_total,
                "radar_current":  current_scores,
            })

        except Exception as e:
            continue

    # Trier par ml_score décroissant
    rows.sort(key=lambda x: x["ml_score"], reverse=True)

    return {
        "count":   len(rows),
        "years_ahead": request.years_ahead,
        "players": rows,
    }


@app.post("/player/similar-pros")
async def get_similar_pros(request: PredictRequest, top_k: int = 5):
    """
    Retourne les joueurs pros réels les plus similaires à un jeune joueur.
    Lecture : "si ce joueur continue sa trajectoire, il pourrait ressembler à X"

    Nécessite : data/raw/pro_reference_database_clean.csv
    """
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé")

    try:
        from uroom.similarity import (
            build_similarity_report,
            compute_trajectory_similarity,
            load_sofifa_pro_database,
        )

        df_raw    = snapshots_to_dataframe(request.snapshots)
        player_id = df_raw["player_id"].iloc[0]
        df, _     = run_pipeline(df_raw)

        if df.empty:
            raise HTTPException(status_code=422, detail="Impossible de calculer les features")

        # Charger la base SoFIFA uniquement
        sofifa_csv = Path(__file__).parent.parent / "data" / "raw" / "sofifa_young_pros.csv"
        if not sofifa_csv.exists():
            raise HTTPException(status_code=503, detail="Base SoFIFA introuvable")

        pro_db = load_sofifa_pro_database(
            sofifa_csv = str(sofifa_csv),
            min_overall = 65,
            verbose = False,
        )

        # Rapport de similarité — sans filtre d'âge (comparaison de style de jeu)
        report = build_similarity_report(
            player_id  = player_id,
            df         = df,
            pro_db     = pro_db,
            top_k      = top_k,
            age_window = None,
        )

        # Score de trajectoire
        traj = compute_trajectory_similarity(
            player_id  = player_id,
            df         = df,
            pro_db     = pro_db,
            age_window = None,
        )

        # Formater les résultats par snapshot
        snapshots_result = []
        for snap in report.get("snapshots", []):
            similar = []
            for res in snap.get("similar_pros", []):
                similar.append({
                    "pro_name":        res.pro_name,
                    "pro_player_id":   res.pro_player_id,
                    "similarity_score": res.similarity_score,
                    "mahalanobis_dist": res.mahalanobis_dist,
                })
            snapshots_result.append({
                "age":         round(snap["age"], 1),
                "season":      snap["season"],
                "similar_pros": similar,
            })

        # Meilleur match global
        best_match = traj.get("best_match_overall")

        return {
            "player_id":        player_id,
            "trajectory_score": traj.get("trajectory_score", 0.0),
            "trend":            traj.get("trend", "unknown"),
            "best_match": {
                "pro_name":        best_match.pro_name        if best_match else None,
                "similarity_score": best_match.similarity_score if best_match else None,
            },
            "snapshots": snapshots_result,
            "message": (
                f"Si {player_id} continue sa trajectoire, "
                f"il pourrait ressembler à {best_match.pro_name.split('(')[0].strip()}"
                if best_match else "Profil en construction — plus de données nécessaires"
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/player/{player_id}/radar")
async def get_radar(player_id: str, season: Optional[str] = None):
    """
    Retourne uniquement le radar d'un joueur déjà en base.
    À utiliser quand les données sont déjà calculées et stockées.

    Note : en production, cet endpoint récupérera les données
    depuis ta base de données au lieu de recalculer.
    """
    return {
        "message": f"Endpoint pour {player_id} — connecter à ta DB en production",
        "season":  season,
    }
