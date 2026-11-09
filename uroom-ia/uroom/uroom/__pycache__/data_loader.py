"""
uroom/data_loader.py
Chargement de vraies données depuis des fichiers CSV.

Convertit les CSV exportés depuis la web app / mobile
en objets Player et PlayerSnapshot compatibles avec le pipeline ML.

Format attendu : voir data/raw/template_joueurs.csv et template_snapshots.csv
"""

import pandas as pd
import numpy as np
from datetime import date, datetime
from pathlib import Path

from uroom.schemas import (
    Player, PlayerSnapshot, PhysicalMetrics, TechnicalMetrics,
    ScoutObservation, Position, Foot, CompetitionLevel
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(val) -> date:
    if isinstance(val, date):
        return val
    return datetime.strptime(str(val).strip(), "%Y-%m-%d").date()


def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_int(val, default: int = 0) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _parse_is_pro(val) -> bool | None:
    """is_pro peut être vide (joueur encore en formation) ou 0/1/True/False."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    if str(val).strip() == "":
        return None
    return bool(int(val))


# ---------------------------------------------------------------------------
# Chargement des joueurs
# ---------------------------------------------------------------------------

def load_players(csv_path: str | Path) -> list[Player]:
    """
    Charge la liste des joueurs depuis un CSV.

    Colonnes requises :
        player_id, first_name, last_name, birth_date,
        position, dominant_foot, nationality, academy

    Colonne optionnelle :
        is_pro  (laisser vide si le joueur est encore en formation)
    """
    df = pd.read_csv(csv_path, dtype=str)
    df.columns = df.columns.str.strip()

    # Validation des colonnes obligatoires
    required = {"player_id", "first_name", "last_name", "birth_date",
                "position", "dominant_foot", "nationality", "academy"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Colonnes manquantes dans {csv_path} : {missing}")

    players = []
    errors  = []

    for idx, row in df.iterrows():
        try:
            player = Player(
                player_id      = str(row["player_id"]).strip(),
                first_name     = str(row["first_name"]).strip(),
                last_name      = str(row["last_name"]).strip(),
                birth_date     = _parse_date(row["birth_date"]),
                position       = Position(str(row["position"]).strip().upper()),
                dominant_foot  = Foot(str(row["dominant_foot"]).strip().lower()),
                nationality    = str(row["nationality"]).strip(),
                academy        = str(row["academy"]).strip(),
                is_pro         = _parse_is_pro(row.get("is_pro")),
            )
            players.append(player)

        except Exception as e:
            errors.append(f"  Ligne {idx + 2} (player_id={row.get('player_id')}) : {e}")

    if errors:
        print(f"⚠️  {len(errors)} erreur(s) lors du chargement des joueurs :")
        for err in errors:
            print(err)

    print(f"✅ {len(players)} joueurs chargés depuis {csv_path}")
    return players


# ---------------------------------------------------------------------------
# Chargement des snapshots
# ---------------------------------------------------------------------------

def load_snapshots(csv_path: str | Path) -> list[PlayerSnapshot]:
    """
    Charge les snapshots depuis un CSV.

    Une ligne CSV = un snapshot (un joueur à une saison donnée).
    Les observations scout sont encodées directement dans le CSV
    (une observation par snapshot pour simplifier l'import).

    Colonnes requises : voir template_snapshots.csv
    """
    df = pd.read_csv(csv_path, dtype=str)
    df.columns = df.columns.str.strip()

    required = {
        "player_id", "snapshot_date", "season", "competition_level",
        "height_cm", "weight_kg", "sprint_10m_sec", "sprint_30m_sec",
        "jump_cm", "endurance_score",
        "matches_played", "minutes_played",
        "pass_accuracy_pct", "dribble_success_pct", "shots_on_target_pct",
        "duels_won_pct", "interceptions_per90", "goals_per90", "assists_per90",
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Colonnes manquantes dans {csv_path} : {missing}")

    snapshots = []
    errors    = []

    for idx, row in df.iterrows():
        try:
            snapshot_date = _parse_date(row["snapshot_date"])

            physical = PhysicalMetrics(
                height_cm       = _safe_float(row["height_cm"]),
                weight_kg       = _safe_float(row["weight_kg"]),
                sprint_10m_sec  = _safe_float(row["sprint_10m_sec"]),
                sprint_30m_sec  = _safe_float(row["sprint_30m_sec"]),
                jump_cm         = _safe_float(row["jump_cm"]),
                endurance_score = _safe_float(row["endurance_score"]),
            )

            technical = TechnicalMetrics(
                matches_played       = _safe_int(row["matches_played"]),
                minutes_played       = _safe_int(row["minutes_played"]),
                pass_accuracy_pct    = _safe_float(row["pass_accuracy_pct"]),
                dribble_success_pct  = _safe_float(row["dribble_success_pct"]),
                shots_on_target_pct  = _safe_float(row["shots_on_target_pct"]),
                duels_won_pct        = _safe_float(row["duels_won_pct"]),
                interceptions_per90  = _safe_float(row["interceptions_per90"]),
                goals_per90          = _safe_float(row["goals_per90"]),
                assists_per90        = _safe_float(row["assists_per90"]),
            )

            # Observation scout (optionnelle — colonnes préfixées scout_)
            scout_obs = []
            scout_cols = {
                "scout_technical", "scout_physical", "scout_decision",
                "scout_work_rate", "scout_leadership",
                "scout_intelligence", "scout_coachability",
            }
            if scout_cols.issubset(set(df.columns)):
                comp_level_raw = _safe_int(row.get("competition_level", 3), default=3)
                obs = ScoutObservation(
                    scout_id           = str(row.get("scout_id", "UNKNOWN")).strip(),
                    observation_date   = snapshot_date,
                    match_context      = str(row.get("competition_observed", "")).strip(),
                    competition_level  = CompetitionLevel(comp_level_raw),
                    technical_quality  = _safe_float(row["scout_technical"]),
                    physical_presence  = _safe_float(row["scout_physical"]),
                    decision_making    = _safe_float(row["scout_decision"]),
                    work_rate          = _safe_float(row["scout_work_rate"]),
                    leadership         = _safe_float(row["scout_leadership"]),
                    game_intelligence  = _safe_float(row["scout_intelligence"]),
                    coachability       = _safe_float(row["scout_coachability"]),
                )
                scout_obs.append(obs)

            # Calcul de l'âge depuis birth_date du joueur
            # (on ne l'a pas ici — sera recalculé lors du merge si besoin)
            # On stocke l'âge approximatif depuis snapshot_date si dispo
            age_raw = row.get("age")
            if age_raw and str(age_raw).strip():
                age = _safe_float(age_raw)
            else:
                # Fallback : on ne peut pas calculer sans birth_date ici
                # La fonction merge_with_players() calculera l'âge correct
                age = 0.0

            snapshot = PlayerSnapshot(
                player_id          = str(row["player_id"]).strip(),
                snapshot_date      = snapshot_date,
                age                = age,
                season             = str(row["season"]).strip(),
                competition_level  = CompetitionLevel(_safe_int(row["competition_level"], 3)),
                physical           = physical,
                technical          = technical,
                scout_observations = scout_obs,
            )
            snapshots.append(snapshot)

        except Exception as e:
            errors.append(f"  Ligne {idx + 2} (player_id={row.get('player_id')}) : {e}")

    if errors:
        print(f"⚠️  {len(errors)} erreur(s) lors du chargement des snapshots :")
        for err in errors:
            print(err)

    print(f"✅ {len(snapshots)} snapshots chargés depuis {csv_path}")
    return snapshots


# ---------------------------------------------------------------------------
# Merge joueurs + snapshots (calcule l'âge réel)
# ---------------------------------------------------------------------------

def merge_players_snapshots(
    players: list[Player],
    snapshots: list[PlayerSnapshot],
) -> tuple[list[Player], list[PlayerSnapshot]]:
    """
    Recalcule l'âge de chaque snapshot à partir de la birth_date du joueur.
    Filtre les snapshots dont le player_id n'existe pas dans la liste joueurs.
    """
    player_index = {p.player_id: p for p in players}
    valid_snapshots = []
    orphans = []

    for snap in snapshots:
        player = player_index.get(snap.player_id)
        if player is None:
            orphans.append(snap.player_id)
            continue
        # Recalculer l'âge exact
        snap.age = player.age_at(snap.snapshot_date)
        valid_snapshots.append(snap)

    if orphans:
        unique_orphans = list(set(orphans))
        print(f"⚠️  {len(unique_orphans)} player_id introuvables dans la liste joueurs : "
              f"{unique_orphans[:5]}{'...' if len(unique_orphans) > 5 else ''}")

    print(f"✅ Merge terminé : {len(valid_snapshots)} snapshots valides "
          f"pour {len(player_index)} joueurs")
    return players, valid_snapshots


# ---------------------------------------------------------------------------
# Fonction principale : tout charger d'un coup
# ---------------------------------------------------------------------------

def load_dataset(
    players_csv: str | Path,
    snapshots_csv: str | Path,
) -> tuple[list[Player], list[PlayerSnapshot]]:
    """
    Point d'entrée principal.
    Charge et valide joueurs + snapshots depuis deux fichiers CSV.

    Usage dans le notebook :
        players, snapshots = load_dataset(
            "data/raw/joueurs.csv",
            "data/raw/snapshots.csv",
        )
        df = build_feature_matrix(snapshots, players)
    """
    print("── Chargement des joueurs ──────────────────")
    players   = load_players(players_csv)

    print("\n── Chargement des snapshots ────────────────")
    snapshots = load_snapshots(snapshots_csv)

    print("\n── Merge et validation ─────────────────────")
    players, snapshots = merge_players_snapshots(players, snapshots)

    return players, snapshots


# ---------------------------------------------------------------------------
# Diagnostic rapide du dataset chargé
# ---------------------------------------------------------------------------

def dataset_summary(players: list[Player], snapshots: list[PlayerSnapshot]):
    """
    Affiche un résumé rapide du dataset pour vérifier la qualité des données.
    """
    n_pro    = sum(1 for p in players if p.is_pro is True)
    n_nonpro = sum(1 for p in players if p.is_pro is False)
    n_unknown = sum(1 for p in players if p.is_pro is None)

    snap_per_player = {}
    for s in snapshots:
        snap_per_player.setdefault(s.player_id, []).append(s.age)

    ages = [s.age for s in snapshots if s.age > 0]

    print("=" * 45)
    print("RÉSUMÉ DU DATASET")
    print("=" * 45)
    print(f"Joueurs total      : {len(players)}")
    print(f"  — Pros (labelés) : {n_pro}")
    print(f"  — Non-pros       : {n_nonpro}")
    print(f"  — Sans label     : {n_unknown}  ← joueurs encore en formation")
    print(f"Snapshots total    : {len(snapshots)}")
    print(f"Snapshots/joueur   : {len(snapshots) / max(len(players), 1):.1f} en moyenne")
    if ages:
        print(f"Âges               : {min(ages):.1f} – {max(ages):.1f} ans")
    scouts = [obs for s in snapshots for obs in s.scout_observations]
    print(f"Observations scout : {len(scouts)}")
    print("=" * 45)