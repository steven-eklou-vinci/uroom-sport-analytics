"""
uroom/features.py
Feature engineering longitudinal pour le modèle de potentiel.

Version 2 — philosophie révisée :
- Le score scout N'EST PLUS une feature core du modèle
- Le modèle est basé sur des données objectives (PHV, technique, physique)
- Le scout devient un signal bonus si disponible (>= 2 observations)
- Chaque joueur reçoit un score de fiabilité selon sa couverture scout
"""

import pandas as pd
import numpy as np
from typing import Optional

from uroom.schemas import Player, PlayerSnapshot
from uroom.maturation import add_maturation_features, PHYSICAL_METRICS_TO_ADJUST


# ---------------------------------------------------------------------------
# Groupes de features — philosophie objectif-first
# ---------------------------------------------------------------------------

# Groupe 1 : toujours disponibles — base du modèle, aucune dépendance scout
CORE_FEATURES_OBJECTIVE = [
    "phv_offset",
    "phv_zscore_jump",
    "phv_zscore_endurance",
    "phv_zscore_sprint30m",
    "pass_accuracy_pct",
    "duels_won_pct",
    "adj_pass_accuracy_pct",
    "adj_duels_won_pct",
    "delta_pass_accuracy_pct",
    "delta_endurance_score",
    "delta_duels_won_pct",
    "age",
    "competition_level",
]

# Groupe 2 : bonus scout — ajouté uniquement si scout_observation_count >= MIN_SCOUT_OBS
SCOUT_BONUS_FEATURES = [
    "avg_scout_score",
    "delta_avg_scout_score",
    "rolling_mean_avg_scout_score",
]

# Seuil minimum d'observations scout pour activer les features scout
MIN_SCOUT_OBS = 2

# Métriques sur lesquelles calculer les deltas
DELTA_FEATURES = [
    "height_cm",
    "weight_kg",
    "sprint_10m_sec",
    "sprint_30m_sec",
    "jump_cm",
    "endurance_score",
    "pass_accuracy_pct",
    "dribble_success_pct",
    "shots_on_target_pct",
    "duels_won_pct",
    "interceptions_per90",
    "goals_per90",
    "assists_per90",
    "avg_scout_score",
]

# Métriques à normaliser par stade de maturité
PERCENTILE_FEATURES = [
    "height_cm",
    "sprint_10m_sec",
    "sprint_30m_sec",
    "jump_cm",
    "endurance_score",
    "pass_accuracy_pct",
    "dribble_success_pct",
    "duels_won_pct",
    "avg_scout_score",
]

# Pondération par niveau de compétition
COMPETITION_WEIGHT = {
    1: 1.30,
    2: 1.15,
    3: 1.00,
    4: 0.85,
    5: 0.70,
}


# ---------------------------------------------------------------------------
# Étape 1 : Sérialisation snapshot -> dict plat
# ---------------------------------------------------------------------------

def snapshot_to_dict(snapshot: PlayerSnapshot, player: Player) -> dict:
    p = snapshot.physical
    t = snapshot.technical

    row = {
        "player_id":         snapshot.player_id,
        "snapshot_date":     snapshot.snapshot_date,
        "season":            snapshot.season,
        "age":               snapshot.age,
        "is_pro":            int(player.is_pro) if player.is_pro is not None else None,

        "position":          player.position.value,
        "dominant_foot":     player.dominant_foot.value,
        "birth_month":       player.birth_date.month,
        "competition_level": snapshot.competition_level.value,

        "height_cm":          p.height_cm,
        "weight_kg":          p.weight_kg,
        "sitting_height_cm":  getattr(p, "sitting_height_cm", 0.0),
        "bmi":                p.bmi,
        "sprint_10m_sec":     p.sprint_10m_sec,
        "sprint_30m_sec":     p.sprint_30m_sec,
        "jump_cm":            p.jump_cm,
        "endurance_score":    p.endurance_score,

        "matches_played":        t.matches_played,
        "minutes_played":        t.minutes_played,
        "pass_accuracy_pct":     t.pass_accuracy_pct,
        "dribble_success_pct":   t.dribble_success_pct,
        "shots_on_target_pct":   t.shots_on_target_pct,
        "duels_won_pct":         t.duels_won_pct,
        "interceptions_per90":   t.interceptions_per90,
        "goals_per90":           t.goals_per90,
        "assists_per90":         t.assists_per90,

        "avg_scout_score":         snapshot.avg_scout_score,
        "scout_observation_count": snapshot.scout_observation_count,
    }

    return row


def snapshots_to_dataframe(
    snapshots: list[PlayerSnapshot],
    players: list[Player],
) -> pd.DataFrame:
    player_index = {p.player_id: p for p in players}
    rows = [
        snapshot_to_dict(snap, player_index[snap.player_id])
        for snap in snapshots
        if snap.player_id in player_index
    ]
    df = pd.DataFrame(rows)
    df = df.sort_values(["player_id", "age"]).reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# Étape 2 : Deltas de progression
# ---------------------------------------------------------------------------

def add_delta_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = df.sort_values(["player_id", "age"])

    for feat in DELTA_FEATURES:
        if feat in df.columns:
            df[f"delta_{feat}"] = df.groupby("player_id")[feat].diff()

    df["age_gap"] = df.groupby("player_id")["age"].diff()

    for feat in DELTA_FEATURES:
        delta_col = f"delta_{feat}"
        if delta_col in df.columns:
            df[f"rate_{feat}"] = df[delta_col] / df["age_gap"].replace(0, np.nan)

    return df


# ---------------------------------------------------------------------------
# Étape 3 : Features glissantes
# ---------------------------------------------------------------------------

def add_rolling_features(df: pd.DataFrame, window: int = 3) -> pd.DataFrame:
    df = df.copy()
    df = df.sort_values(["player_id", "age"])

    key_features = [
        "pass_accuracy_pct",
        "duels_won_pct",
        "endurance_score",
        "avg_scout_score",
    ]

    for feat in key_features:
        if feat in df.columns:
            df[f"rolling_mean_{feat}"] = df.groupby("player_id")[feat].transform(
                lambda x: x.rolling(window=window, min_periods=1).mean()
            )
            df[f"rolling_std_{feat}"] = df.groupby("player_id")[feat].transform(
                lambda x: x.rolling(window=window, min_periods=2).std()
            )

    return df


# ---------------------------------------------------------------------------
# Étape 4 : Percentiles par stade de maturité
# ---------------------------------------------------------------------------

def add_maturity_percentiles(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for feat in PERCENTILE_FEATURES:
        if feat not in df.columns:
            continue

        def percentile_rank(group):
            return group.rank(pct=True) * 100

        if "maturity_stage" in df.columns:
            df[f"pct_{feat}"] = df.groupby("maturity_stage")[feat].transform(percentile_rank)
        else:
            df["age_bin"] = (df["age"] // 1.0).round(0)
            df[f"pct_{feat}"] = df.groupby("age_bin")[feat].transform(percentile_rank)
            df = df.drop(columns=["age_bin"])

        if "sprint" in feat:
            df[f"pct_{feat}"] = 100 - df[f"pct_{feat}"]

    return df


# ---------------------------------------------------------------------------
# Étape 5 : Ajustement par niveau de compétition
# ---------------------------------------------------------------------------

def add_competition_adjusted_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    weight = df["competition_level"].map(COMPETITION_WEIGHT).fillna(1.0)

    adjusted_features = [
        "pass_accuracy_pct",
        "dribble_success_pct",
        "shots_on_target_pct",
        "duels_won_pct",
        "goals_per90",
        "assists_per90",
    ]

    for feat in adjusted_features:
        if feat in df.columns:
            df[f"adj_{feat}"] = df[feat] * weight

    return df


# ---------------------------------------------------------------------------
# Étape 6 : Indicateurs de fiabilité (affichage uniquement, jamais dans le ML)
# ---------------------------------------------------------------------------

def add_reliability_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ajoute des indicateurs de fiabilité pour l'affichage côté front.
    Ces colonnes ne sont JAMAIS utilisées comme features ML.

    score_reliability :
        'high'   - >= 2 observations scout ET âge dans la fenêtre PHV fiable
        'medium' - 1 observation scout OU hors fenêtre PHV idéale
        'low'    - aucune observation scout

    scout_alert :
        Signal qualitatif du scout si disponible — ne modifie pas le score ML.
    """
    df = df.copy()

    df["scout_coverage"] = df["scout_observation_count"].fillna(0).astype(int)

    def reliability(row):
        has_scout    = row["scout_coverage"] >= MIN_SCOUT_OBS
        phv_reliable = row.get("phv_reliability", "low") == "high"

        if has_scout and phv_reliable:
            return "high"
        elif has_scout or phv_reliable:
            return "medium"
        else:
            return "low"

    df["score_reliability"] = df.apply(reliability, axis=1)

    def scout_alert(row):
        if row["scout_coverage"] < MIN_SCOUT_OBS:
            return None
        score = row.get("avg_scout_score")
        if score is None or (isinstance(score, float) and np.isnan(score)):
            return None
        if score >= 8.0:
            return "scout_confirme"
        elif score <= 4.0:
            return "scout_alerte"
        else:
            return None

    df["scout_alert"] = df.apply(scout_alert, axis=1)

    return df


# ---------------------------------------------------------------------------
# Pipeline complet
# ---------------------------------------------------------------------------

def build_feature_matrix(
    snapshots: list[PlayerSnapshot],
    players: list[Player],
    has_sitting_height: bool = False,
    verbose: bool = True,
) -> pd.DataFrame:
    """
    Pipeline complet objectif-first.

    Le score scout est calculé et disponible dans le DataFrame
    mais n'est PAS inclus dans les core features par défaut.
    Utilisez select_features_for_dataset() pour choisir le bon mode.
    """
    if verbose:
        print("1/7 — Sérialisation des snapshots...")
    df = snapshots_to_dataframe(snapshots, players)

    if verbose:
        print("2/7 — Maturité biologique (PHV offset, Z-scores)...")
    df = add_maturation_features(df, has_sitting_height=has_sitting_height)

    if verbose:
        print("3/7 — Deltas de progression (slope = talent)...")
    df = add_delta_features(df)

    if verbose:
        print("4/7 — Features glissantes...")
    df = add_rolling_features(df)

    if verbose:
        print("5/7 — Percentiles par stade de maturité...")
    df = add_maturity_percentiles(df)

    if verbose:
        print("6/7 — Ajustement par niveau de compétition...")
    df = add_competition_adjusted_features(df)

    if verbose:
        print("7/7 — Indicateurs de fiabilité...")
    df = add_reliability_indicators(df)

    df = df.dropna(subset=["is_pro"])

    if verbose:
        n_pro   = int(df["is_pro"].sum())
        n_total = len(df)
        n_with_scout = int((df["scout_coverage"] >= MIN_SCOUT_OBS).sum())
        print(f"\nDataset final      : {n_total} snapshots "
              f"({n_pro} pros / {n_total - n_pro} non-pros)")
        print(f"Avec scout ({MIN_SCOUT_OBS}+ obs) : {n_with_scout} "
              f"({n_with_scout/n_total*100:.0f}%)")
        print(f"Sans scout          : {n_total - n_with_scout} "
              f"({(n_total-n_with_scout)/n_total*100:.0f}%)")
        print(f"Features générées   : {len(df.columns)} colonnes")

    return df


# ---------------------------------------------------------------------------
# Sélection des features — trois fonctions selon le contexte
# ---------------------------------------------------------------------------

def get_feature_columns(df: pd.DataFrame) -> list[str]:
    """
    Toutes les features numériques — pour l'exploration uniquement.
    """
    exclude = {
        "player_id", "snapshot_date", "season",
        "is_pro", "age_gap",
        "position", "dominant_foot",
        "score_reliability", "scout_alert", "phv_method", "phv_reliability",
    }
    return [
        col for col in df.columns
        if col not in exclude
        and df[col].dtype in [np.float64, np.int64, float, int]
    ]


def get_core_feature_columns(df: pd.DataFrame) -> list[str]:
    """
    Features objectives uniquement — mode par défaut recommandé.

    Fonctionne pour tous les joueurs, même sans observation scout.
    Évite de reproduire les biais humains des scouts.
    L'IA évalue le joueur sur des données mesurables objectives.
    """
    return [c for c in CORE_FEATURES_OBJECTIVE if c in df.columns]


def get_core_feature_columns_with_scout(df: pd.DataFrame) -> list[str]:
    """
    Features objectives + bonus scout.

    A utiliser UNIQUEMENT si la majorité des snapshots ont
    >= MIN_SCOUT_OBS observations. Le scout enrichit le contexte
    mais ne domine pas le score — il reste un signal parmi d'autres.
    """
    base  = [c for c in CORE_FEATURES_OBJECTIVE if c in df.columns]
    bonus = [c for c in SCOUT_BONUS_FEATURES    if c in df.columns]
    return base + bonus


def select_features_for_dataset(df: pd.DataFrame, verbose: bool = True) -> list[str]:
    """
    Sélectionne automatiquement le bon groupe de features
    selon la couverture scout du dataset.

    Règle : si >= 50% des snapshots ont MIN_SCOUT_OBS observations
    → mode avec scout bonus. Sinon → objectif uniquement.
    """
    if "scout_coverage" not in df.columns:
        if verbose:
            print("Mode : objectif (scout_coverage non disponible)")
        return get_core_feature_columns(df)

    pct_with_scout = (df["scout_coverage"] >= MIN_SCOUT_OBS).mean()

    if pct_with_scout >= 0.50:
        cols = get_core_feature_columns_with_scout(df)
        if verbose:
            print(f"Mode : objectif + scout bonus "
                  f"({pct_with_scout:.0%} ont {MIN_SCOUT_OBS}+ obs)")
    else:
        cols = get_core_feature_columns(df)
        if verbose:
            print(f"Mode : objectif uniquement "
                  f"(seulement {pct_with_scout:.0%} ont {MIN_SCOUT_OBS}+ obs)")

    if verbose:
        print(f"Features sélectionnées : {len(cols)}")

    return cols