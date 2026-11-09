"""
uroom/radar.py
Calcul des scores radar pour l'affichage dans la web app / mobile.

Transforme les features brutes du pipeline ML en scores 0-100
normalisés par âge et stade de maturité PHV.

Les 8 dimensions du radar Uroom :
    Vitesse   → sprint_30m_sec (inversé, normalisé par âge)
    Dribble   → dribble_success_pct (normalisé par stade PHV)
    Tir       → shots_on_target_pct (normalisé par âge)
    Passe     → pass_accuracy_pct (normalisé par stade PHV)
    Défense   → duels_won_pct + interceptions_per90 (composite)
    Physique  → endurance_score + jump_cm (composite)
    Contrôle  → adj_pass_accuracy_pct + adj_dribble_success_pct (composite)
    Vision    → assists_per90 + goals_per90 (composite)

Usage :
    from uroom.radar import compute_radar_scores, compute_radar_history, compute_radar_projection

    # Score radar pour le dernier snapshot d'un joueur
    scores = compute_radar_scores("P0025", df)

    # Historique par saison (données réelles observées)
    history = compute_radar_history("P0025", df)

    # Projections futures personnalisées
    projections = compute_radar_projection("P0025", df, years_ahead=4)

    # Tout en un pour l'API
    data = radar_scores_for_api("P0025", df)
"""

import numpy as np
import pandas as pd
from typing import Optional


# ---------------------------------------------------------------------------
# Normes par âge pour la normalisation
# Sources : Currie (2018), PMC 2025, Huijgen et al. (2015), Murr et al. (2018)
# ---------------------------------------------------------------------------

SPRINT_30M_NORMS = {
    11: {"mean": 4.90, "std": 0.22}, 12: {"mean": 4.76, "std": 0.20},
    13: {"mean": 4.63, "std": 0.18}, 14: {"mean": 4.50, "std": 0.17},
    15: {"mean": 4.38, "std": 0.16}, 16: {"mean": 4.28, "std": 0.15},
    17: {"mean": 4.20, "std": 0.14}, 18: {"mean": 4.15, "std": 0.13},
}
ENDURANCE_NORMS = {
    11: {"mean": 46.2, "std": 5.5}, 12: {"mean": 48.5, "std": 5.8},
    13: {"mean": 51.2, "std": 5.8}, 14: {"mean": 53.8, "std": 5.5},
    15: {"mean": 56.1, "std": 5.2}, 16: {"mean": 58.0, "std": 5.0},
    17: {"mean": 59.5, "std": 4.8}, 18: {"mean": 60.5, "std": 4.5},
}
JUMP_NORMS = {
    11: {"mean": 29.5, "std": 5.2}, 12: {"mean": 32.8, "std": 5.5},
    13: {"mean": 36.1, "std": 5.8}, 14: {"mean": 40.2, "std": 6.0},
    15: {"mean": 43.8, "std": 6.2}, 16: {"mean": 46.5, "std": 6.0},
    17: {"mean": 48.3, "std": 5.8}, 18: {"mean": 49.5, "std": 5.5},
}
PASS_NORMS = {
    11: {"mean": 58.5, "std": 8.5}, 12: {"mean": 61.8, "std": 8.2},
    13: {"mean": 64.5, "std": 7.8}, 14: {"mean": 67.2, "std": 7.5},
    15: {"mean": 69.8, "std": 7.2}, 16: {"mean": 72.0, "std": 6.8},
    17: {"mean": 73.5, "std": 6.5}, 18: {"mean": 74.5, "std": 6.2},
}
DUEL_NORMS = {
    11: {"mean": 42.5, "std": 10.5}, 12: {"mean": 44.2, "std": 10.2},
    13: {"mean": 45.8, "std": 9.8},  14: {"mean": 47.5, "std": 9.5},
    15: {"mean": 49.0, "std": 9.2},  16: {"mean": 50.5, "std": 8.8},
    17: {"mean": 51.8, "std": 8.5},  18: {"mean": 52.5, "std": 8.2},
}
DRIBBLE_NORMS = {
    11: {"mean": 50.0, "std": 12.0}, 12: {"mean": 52.0, "std": 11.5},
    13: {"mean": 54.0, "std": 11.0}, 14: {"mean": 56.0, "std": 10.5},
    15: {"mean": 57.5, "std": 10.0}, 16: {"mean": 59.0, "std": 9.5},
    17: {"mean": 60.0, "std": 9.0},  18: {"mean": 61.0, "std": 8.8},
}
SHOTS_NORMS = {
    11: {"mean": 28.0, "std": 12.0}, 12: {"mean": 30.0, "std": 12.0},
    13: {"mean": 32.0, "std": 11.5}, 14: {"mean": 34.0, "std": 11.0},
    15: {"mean": 36.0, "std": 10.5}, 16: {"mean": 38.0, "std": 10.0},
    17: {"mean": 40.0, "std": 9.5},  18: {"mean": 42.0, "std": 9.0},
}
INTERC_NORMS = {
    11: {"mean": 1.8, "std": 0.8}, 12: {"mean": 1.9, "std": 0.8},
    13: {"mean": 2.0, "std": 0.8}, 14: {"mean": 2.1, "std": 0.7},
    15: {"mean": 2.2, "std": 0.7}, 16: {"mean": 2.3, "std": 0.7},
    17: {"mean": 2.4, "std": 0.6}, 18: {"mean": 2.5, "std": 0.6},
}
VISION_NORMS = {
    11: {"mean": 0.35, "std": 0.20}, 12: {"mean": 0.38, "std": 0.20},
    13: {"mean": 0.40, "std": 0.20}, 14: {"mean": 0.42, "std": 0.20},
    15: {"mean": 0.45, "std": 0.18}, 16: {"mean": 0.47, "std": 0.18},
    17: {"mean": 0.48, "std": 0.17}, 18: {"mean": 0.50, "std": 0.17},
}

# ---------------------------------------------------------------------------
# Taux de progression normative par âge et par dimension
# Combien de points radar un joueur moyen gagne par an selon son âge
# Les taux diminuent avec l'âge : plus grande marge de progression jeune
# Source : Malina (2015), Huijgen (2015)
# ---------------------------------------------------------------------------

PROGRESSION_RATES = {
    "vitesse":  {11: 3.5, 12: 3.2, 13: 2.8, 14: 2.2, 15: 1.8, 16: 1.2, 17: 0.8, 18: 0.5},
    "dribble":  {11: 4.0, 12: 3.8, 13: 3.5, 14: 3.0, 15: 2.5, 16: 2.0, 17: 1.5, 18: 1.0},
    "tir":      {11: 3.8, 12: 3.5, 13: 3.2, 14: 2.8, 15: 2.3, 16: 1.8, 17: 1.3, 18: 0.8},
    "passe":    {11: 4.5, 12: 4.2, 13: 3.8, 14: 3.2, 15: 2.8, 16: 2.2, 17: 1.5, 18: 1.0},
    "defense":  {11: 3.0, 12: 2.8, 13: 2.5, 14: 2.2, 15: 1.8, 16: 1.5, 17: 1.0, 18: 0.7},
    "physique": {11: 5.0, 12: 4.8, 13: 4.5, 14: 3.5, 15: 2.5, 16: 1.5, 17: 0.8, 18: 0.5},
    "controle": {11: 4.2, 12: 4.0, 13: 3.6, 14: 3.0, 15: 2.5, 16: 2.0, 17: 1.4, 18: 0.9},
    "vision":   {11: 3.5, 12: 3.3, 13: 3.0, 14: 2.5, 15: 2.0, 16: 1.6, 17: 1.2, 18: 0.8},
}

# Multiplicateurs par archetype : modulent la vitesse de progression
ARCHETYPE_MULTIPLIERS = {
    "early_bloomer":      {"before_14": 1.2, "after_14": 0.7},
    "late_bloomer":       {"before_14": 0.6, "after_14": 1.4},
    "steady_climber":     {"before_14": 1.0, "after_14": 1.0},
    "inconsistent":       {"before_14": 0.9, "after_14": 0.9},
    "physical_dominant":  {"before_14": 1.1, "after_14": 0.5},
    "early_specialist":   {"before_14": 1.0, "after_14": 0.6},
    "average":            {"before_14": 0.8, "after_14": 0.8},
    "unknown":            {"before_14": 1.0, "after_14": 1.0},
}

DIMENSIONS = ["vitesse", "dribble", "tir", "passe",
              "defense", "physique", "controle", "vision"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_norm(norms_dict: dict, age: float) -> dict:
    age_int = max(11, min(18, int(round(age))))
    return norms_dict.get(age_int, norms_dict[17])


def _zscore_to_score(value: float, mean: float, std: float,
                     invert: bool = False) -> float:
    if std <= 0 or np.isnan(value):
        return 50.0
    z = (value - mean) / std
    if invert:
        z = -z
    z = np.clip(z, -3, 3)
    return float(np.clip(round(50 + z * 15, 1), 0, 100))


def _safe_get(row, col: str, default: float = np.nan) -> float:
    val = row.get(col, default)
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _get_progression_rate(dimension: str, age: float) -> float:
    rates = PROGRESSION_RATES.get(dimension, {})
    age_int = max(11, min(18, int(round(age))))
    return rates.get(age_int, 1.0)


def _get_archetype_multiplier(archetype: str, age: float) -> float:
    mult = ARCHETYPE_MULTIPLIERS.get(archetype, ARCHETYPE_MULTIPLIERS["unknown"])
    return mult["before_14"] if age < 14 else mult["after_14"]


# ---------------------------------------------------------------------------
# Calcul des 8 dimensions
# ---------------------------------------------------------------------------

def _compute_vitesse(row, age: float) -> float:
    norm = _get_norm(SPRINT_30M_NORMS, age)
    sprint = _safe_get(row, "sprint_30m_sec")
    if not np.isnan(sprint) and sprint > 0:
        return _zscore_to_score(sprint, norm["mean"], norm["std"], invert=True)
    zscore = _safe_get(row, "phv_zscore_sprint30m")
    if not np.isnan(zscore):
        return float(np.clip(50 + zscore * 15, 0, 100))
    return 50.0

def _compute_dribble(row, age: float) -> float:
    norm = _get_norm(DRIBBLE_NORMS, age)
    val = _safe_get(row, "adj_dribble_success_pct")
    if not np.isnan(val) and val > 0:
        return _zscore_to_score(val, norm["mean"], norm["std"])
    val = _safe_get(row, "dribble_success_pct")
    if not np.isnan(val) and val > 0:
        return _zscore_to_score(val, norm["mean"], norm["std"])
    return 50.0

def _compute_tir(row, age: float) -> float:
    norm = _get_norm(SHOTS_NORMS, age)
    val = _safe_get(row, "adj_shots_on_target_pct")
    if np.isnan(val):
        val = _safe_get(row, "shots_on_target_pct")
    goals = _safe_get(row, "goals_per90", 0.0)
    if not np.isnan(val) and val > 0:
        score = _zscore_to_score(val, norm["mean"], norm["std"])
        bonus = max(0, (goals - 0.15) * 30)
        return float(np.clip(score + bonus, 0, 100))
    return 50.0

def _compute_passe(row, age: float) -> float:
    norm = _get_norm(PASS_NORMS, age)
    val = _safe_get(row, "adj_pass_accuracy_pct")
    if not np.isnan(val) and val > 0:
        return _zscore_to_score(val, norm["mean"], norm["std"])
    zscore = _safe_get(row, "phv_zscore_pass_accuracy")
    if not np.isnan(zscore):
        return float(np.clip(50 + zscore * 15, 0, 100))
    val = _safe_get(row, "pass_accuracy_pct")
    if not np.isnan(val) and val > 0:
        return _zscore_to_score(val, norm["mean"], norm["std"])
    return 50.0

def _compute_defense(row, age: float) -> float:
    norm_d = _get_norm(DUEL_NORMS, age)
    norm_i = _get_norm(INTERC_NORMS, age)
    duels = _safe_get(row, "adj_duels_won_pct")
    if np.isnan(duels):
        duels = _safe_get(row, "duels_won_pct")
    interc = _safe_get(row, "interceptions_per90", 0.0)
    scores, weights = [], []
    if not np.isnan(duels) and duels > 0:
        scores.append(_zscore_to_score(duels, norm_d["mean"], norm_d["std"]))
        weights.append(0.70)
    if not np.isnan(interc):
        scores.append(_zscore_to_score(interc, norm_i["mean"], norm_i["std"]))
        weights.append(0.30)
    if not scores:
        return 50.0
    total_w = sum(weights)
    return float(sum(s * w / total_w for s, w in zip(scores, weights)))

def _compute_physique(row, age: float) -> float:
    norm_e = _get_norm(ENDURANCE_NORMS, age)
    norm_j = _get_norm(JUMP_NORMS, age)
    scores, weights = [], []
    zscore_e = _safe_get(row, "phv_zscore_endurance")
    if not np.isnan(zscore_e):
        scores.append(float(np.clip(50 + zscore_e * 15, 0, 100)))
        weights.append(0.60)
    else:
        end = _safe_get(row, "endurance_score")
        if not np.isnan(end) and end > 0:
            scores.append(_zscore_to_score(end, norm_e["mean"], norm_e["std"]))
            weights.append(0.60)
    zscore_j = _safe_get(row, "phv_zscore_jump")
    if not np.isnan(zscore_j):
        scores.append(float(np.clip(50 + zscore_j * 15, 0, 100)))
        weights.append(0.40)
    else:
        jump = _safe_get(row, "jump_cm")
        if not np.isnan(jump) and jump > 0:
            scores.append(_zscore_to_score(jump, norm_j["mean"], norm_j["std"]))
            weights.append(0.40)
    if not scores:
        return 50.0
    total_w = sum(weights)
    return float(sum(s * w / total_w for s, w in zip(scores, weights)))

def _compute_controle(row, age: float) -> float:
    passe   = _compute_passe(row, age)
    dribble = _compute_dribble(row, age)
    if passe == 50.0 and dribble == 50.0:
        return 50.0
    return round((passe * 0.5 + dribble * 0.5), 1)

def _compute_vision(row, age: float) -> float:
    norm = _get_norm(VISION_NORMS, age)
    assists = _safe_get(row, "assists_per90", 0.0)
    goals   = _safe_get(row, "goals_per90", 0.0)
    return _zscore_to_score(assists * 0.6 + goals * 0.4, norm["mean"], norm["std"])

def _compute_all_scores(row, age: float) -> dict:
    return {
        "vitesse":  _compute_vitesse(row, age),
        "dribble":  _compute_dribble(row, age),
        "tir":      _compute_tir(row, age),
        "passe":    _compute_passe(row, age),
        "defense":  _compute_defense(row, age),
        "physique": _compute_physique(row, age),
        "controle": _compute_controle(row, age),
        "vision":   _compute_vision(row, age),
    }


# ---------------------------------------------------------------------------
# Scores actuels
# ---------------------------------------------------------------------------

def compute_radar_scores(
    player_id: str,
    df: pd.DataFrame,
    snapshot_index: int = -1,
    round_scores: bool = True,
) -> dict:
    """
    Calcule les 8 scores radar pour le snapshot demandé d'un joueur.
    snapshot_index=-1 = dernier snapshot (le plus récent).
    """
    player_df = df[df["player_id"] == player_id].sort_values("age")
    if player_df.empty:
        return {"error": f"Joueur {player_id} introuvable."}

    row = player_df.iloc[snapshot_index]
    age = float(row.get("age", 14.0))
    scores = _compute_all_scores(row, age)

    if round_scores:
        scores = {k: int(round(v)) for k, v in scores.items()}

    result = {
        "player_id":    player_id,
        "age":          round(age, 1),
        "season":       str(row.get("season", "")),
        "scores":       scores,
        "is_projected": False,
    }
    for col in ["potential_score", "score_reliability", "scout_alert",
                "scout_coverage", "is_pro"]:
        val = row.get(col)
        if val is not None:
            result[col] = val
    return result


# ---------------------------------------------------------------------------
# Historique observé
# ---------------------------------------------------------------------------

def compute_radar_history(
    player_id: str,
    df: pd.DataFrame,
    round_scores: bool = True,
) -> dict:
    """
    Retourne les scores radar pour chaque snapshot RÉEL observé.
    is_projected = False pour toutes les entrées.
    """
    player_df = df[df["player_id"] == player_id].sort_values("age")
    if player_df.empty:
        return {"error": f"Joueur {player_id} introuvable."}

    history = {}
    for _, row in player_df.iterrows():
        age    = float(row.get("age", 14.0))
        season = str(row.get("season", ""))
        scores = _compute_all_scores(row, age)
        if round_scores:
            scores = {k: int(round(v)) for k, v in scores.items()}
        entry = {
            "age": round(age, 1), "season": season,
            "scores": scores, "is_projected": False,
        }
        for col in ["potential_score", "score_reliability", "scout_alert"]:
            val = row.get(col)
            if val is not None:
                entry[col] = val
        history[season] = entry
    return history


# ---------------------------------------------------------------------------
# Projections futures personnalisées
# ---------------------------------------------------------------------------

def compute_radar_projection(
    player_id: str,
    df: pd.DataFrame,
    years_ahead: int = 4,
    round_scores: bool = True,
) -> dict:
    """
    Projette les scores radar sur les prochaines années.

    La projection est PERSONNALISÉE — pas un "+3 fixe".

    3 composantes fusionnées :
    1. Pente personnelle du joueur (régression sur ses snapshots passés)
    2. Taux normatif par âge (un 12 ans progresse plus vite qu'un 16 ans)
    3. Archetype multiplicateur (late_bloomer accélère, physical_dominant plafonne)

    Plus le joueur a de snapshots, plus sa pente personnelle pèse dans la projection.
    Avec 1 seul snapshot : 100% normatif.
    Avec 3+ snapshots    : 70% pente perso + 30% normatif.
    """
    player_df = df[df["player_id"] == player_id].sort_values("age")
    if player_df.empty:
        return {"error": f"Joueur {player_id} introuvable."}

    # Archetype
    archetype = "unknown"
    if "archetype" in player_df.columns:
        arch_val = player_df["archetype"].iloc[-1]
        if arch_val and not (isinstance(arch_val, float) and np.isnan(arch_val)):
            archetype = str(arch_val)

    # Scores observés
    observed_ages    = []
    observed_seasons = []
    observed_scores  = {}

    for _, row in player_df.iterrows():
        age    = float(row.get("age", 14.0))
        season = str(row.get("season", ""))
        observed_scores[age] = _compute_all_scores(row, age)
        observed_ages.append(age)
        observed_seasons.append(season)

    if not observed_ages:
        return {}

    last_age     = observed_ages[-1]
    last_scores  = observed_scores[last_age]
    last_season  = observed_seasons[-1]
    n_snapshots  = len(observed_ages)

    # Pente personnelle par dimension
    personal_slopes = {}
    for dim in DIMENSIONS:
        if n_snapshots >= 2:
            ages_arr   = np.array(observed_ages)
            scores_arr = np.array([observed_scores[a][dim] for a in observed_ages])
            slope = float(np.polyfit(ages_arr, scores_arr, 1)[0])
            slope = float(np.clip(slope, -8.0, 12.0))
        else:
            slope = 0.0
        personal_slopes[dim] = slope

    # Poids pente perso vs normatif selon nombre de snapshots
    personal_weight  = {1: 0.00, 2: 0.40, 3: 0.70}.get(n_snapshots, 0.80)
    normative_weight = 1.0 - personal_weight

    # Parser la saison pour construire les saisons futures
    try:
        last_year = int(last_season.split("-")[0])
    except (ValueError, IndexError):
        last_year = 2025

    current_scores = {k: float(v) for k, v in last_scores.items()}
    projections    = {}

    for i in range(1, years_ahead + 1):
        proj_age    = round(last_age + i, 1)
        proj_year   = last_year + i
        proj_season = f"{proj_year}-{str(proj_year + 1)[2:]}"

        proj_scores  = {}
        improvements = {}

        for dim in DIMENSIONS:
            normative_gain = _get_progression_rate(dim, proj_age)
            arch_mult      = _get_archetype_multiplier(archetype, proj_age)

            # On ne projette jamais une régression future
            # La pente personnelle négative devient un signal d'alerte, pas une projection
            personal_gain_clipped = max(0.0, personal_slopes[dim])

            base_gain = (
                personal_gain_clipped * personal_weight +
                normative_gain        * normative_weight
            ) * arch_mult

            # Ceiling factor généreux — ne freine que les joueurs déjà très proches du plafond
            # score 50 → factor 1.5 | score 70 → factor 1.0 | score 90 → factor 0.5
            current_val    = current_scores[dim]
            ceiling_factor = max(0.5, (100 - current_val) / 25.0)
            adjusted_gain  = float(np.clip(base_gain * ceiling_factor, 0.0, 10.0))

            new_score      = float(np.clip(current_val + adjusted_gain, 0, 99))
            proj_scores[dim]  = new_score
            improvements[dim] = round(adjusted_gain, 1)

        current_scores = proj_scores.copy()

        if round_scores:
            proj_scores_display = {k: int(round(v)) for k, v in proj_scores.items()}
        else:
            proj_scores_display = {k: round(v, 1) for k, v in proj_scores.items()}

        avg_improvement = round(float(np.mean(list(improvements.values()))), 1)

        # Signal d'alerte si plusieurs dimensions en régression observée
        regressing_dims = [
            d for d, s in personal_slopes.items() if s < -1.0
        ]

        projections[proj_season] = {
            "age":             round(proj_age, 1),
            "season":          proj_season,
            "scores":          proj_scores_display,
            "is_projected":    True,
            "archetype":       archetype,
            "avg_improvement": avg_improvement,
            "regressing_dims": regressing_dims if i == 1 else [],
            "improvements":    {k: round(v, 1) for k, v in improvements.items()},
            "projection_basis": {
                "n_snapshots_used": n_snapshots,
                "personal_weight":  round(personal_weight, 2),
                "normative_weight": round(normative_weight, 2),
                "archetype":        archetype,
            },
            "display_message": _build_projection_message(
                proj_year, avg_improvement, archetype, proj_age, n_snapshots
            ),
        }

    return projections


def _build_projection_message(
    year: int,
    avg_improvement: float,
    archetype: str,
    age: float,
    n_snapshots: int,
) -> str:
    """Message personnalisé affiché sous le radar pour les années projetées."""

    if n_snapshots >= 3:
        confidence = "basée sur votre trajectoire personnelle"
    elif n_snapshots == 2:
        confidence = "basée sur vos 2 premières saisons"
    else:
        confidence = "estimée selon les normes de développement pour votre âge"

    archetype_messages = {
        "early_bloomer":     "Votre profil indique une progression précoce — maintenez votre avance technique.",
        "late_bloomer":      "Votre profil indique une accélération progressive — la meilleure période est devant vous.",
        "steady_climber":    "Votre progression est régulière et constante — continuez sur cette trajectoire.",
        "inconsistent":      "Votre profil nécessite de la régularité — les résultats seront au rendez-vous avec de la constance.",
        "physical_dominant": "Concentrez-vous sur le développement technique pour compléter votre profil physique.",
        "early_specialist":  "Diversifiez vos compétences pour maintenir votre progression.",
        "average":           "Une progression régulière est attendue avec un bon encadrement.",
        "unknown":           "Projection basée sur les normes de développement pour votre profil.",
    }
    arch_msg = archetype_messages.get(archetype, archetype_messages["unknown"])

    if avg_improvement > 0:
        prog_str = f"Amélioration projetée : +{avg_improvement:.1f} points en moyenne."
    elif avg_improvement < 0:
        prog_str = f"Attention : régression projetée de {abs(avg_improvement):.1f} points si la trajectoire actuelle se maintient."
    else:
        prog_str = "Progression stable projetée."

    return (
        f"Prédiction IA Uroom ({year}) — Projection {confidence}. "
        f"{prog_str} {arch_msg}"
    )


# ---------------------------------------------------------------------------
# Format API complet
# ---------------------------------------------------------------------------

def radar_scores_for_api(
    player_id: str,
    df: pd.DataFrame,
    years_ahead: int = 4,
) -> dict:
    """
    Format complet pour l'API REST.
    Retourne observations réelles + projections futures dans un timeline unifié.

    {
        "player_id": "P0025",
        "current":   {scores du dernier snapshot réel},
        "history":   {"2022-23": {"is_projected": False, ...}, ...},
        "projections": {"2025-26": {"is_projected": True, "display_message": "...", ...}, ...},
        "timeline":  {history + projections dans l'ordre chronologique}
    }
    """
    current     = compute_radar_scores(player_id, df, snapshot_index=-1)
    history     = compute_radar_history(player_id, df)
    projections = compute_radar_projection(player_id, df, years_ahead=years_ahead)

    if "error" in current:
        return current

    timeline = {}
    timeline.update(history)
    timeline.update(projections)

    return {
        "player_id":   player_id,
        "current":     current,
        "history":     history,
        "projections": projections,
        "timeline":    timeline,
    }


# ---------------------------------------------------------------------------
# Batch — classement de plusieurs joueurs
# ---------------------------------------------------------------------------

def compute_radar_batch(
    player_ids: list,
    df: pd.DataFrame,
    snapshot_index: int = -1,
) -> pd.DataFrame:
    """Calcule les scores radar pour une liste de joueurs, retourne un DataFrame."""
    rows = []
    for pid in player_ids:
        result = compute_radar_scores(pid, df, snapshot_index=snapshot_index)
        if "error" not in result:
            row = {"player_id": pid, "age": result["age"], "season": result["season"]}
            row.update(result["scores"])
            for col in ["potential_score", "score_reliability", "scout_alert", "is_pro"]:
                if col in result:
                    row[col] = result[col]
            rows.append(row)
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows).sort_values("potential_score", ascending=False)

def compute_radar_projection_v2(
    player_id: str,
    df: pd.DataFrame,
    pipeline,
    used_features: list,
    years_ahead: int = 4,
    round_scores: bool = True,
) -> dict:
    """
    Version améliorée de compute_radar_projection.
    Intègre le score ML de potentiel pour moduler la vitesse de progression.

    Logique :
      ml >= 70% → le joueur progresse 1.5x plus vite que la norme
      ml = 50%  → progression normative (x1.0)
      ml <= 30% → progression 0.6x plus lente

    Un joueur avec 80% de potentiel ML ira beaucoup plus loin sur 4 ans
    qu'un joueur avec 25% — même s'ils ont les mêmes scores actuels.
    """
    player_df = df[df["player_id"] == player_id].sort_values("age")
    if player_df.empty:
        return {"error": f"Joueur {player_id} introuvable."}

    # Score ML de potentiel sur le dernier snapshot
    last_row  = player_df.iloc[-1]
    available = [c for c in used_features if c in df.columns]
    try:
        X        = last_row[available].values.reshape(1, -1)
        ml_score = float(pipeline.predict_proba(X)[0][1] * 100)
    except Exception:
        ml_score = 50.0  # fallback neutre

    # Multiplicateur de potentiel
    # ml=80% → 1.6 | ml=50% → 1.0 | ml=20% → 0.5
    potential_multiplier = float(np.clip(0.3 + (ml_score / 100) * 1.4, 0.3, 1.8))

    # Récupérer les projections de base
    base_projections = compute_radar_projection(
        player_id, df, years_ahead=years_ahead, round_scores=False
    )
    if "error" in base_projections:
        return base_projections

    # Recalculer les scores en appliquant le multiplicateur de potentiel
    # sur le GAIN (pas sur le score absolu)
    last_scores = compute_radar_history(player_id, df)
    if "error" in last_scores:
        return last_scores

    last_season_key = list(last_scores.keys())[-1]
    last_observed   = last_scores[last_season_key]["scores"]

    adjusted_projections = {}
    current_scores = {k: float(v) for k, v in last_observed.items()}

    for season, proj_data in base_projections.items():
        adjusted_scores = {}
        improvements    = {}
        proj_age        = proj_data["age"]

        for dim in DIMENSIONS:
            # Taux normatif pour cet âge et cette dimension
            normative_gain = _get_progression_rate(dim, proj_age)

            # Archetype multiplier
            archetype  = proj_data.get("archetype", "unknown")
            arch_mult  = _get_archetype_multiplier(archetype, proj_age)

            # Ceiling factor — moins restrictif
            current_val    = current_scores[dim]
            ceiling_factor = max(0.5, (100 - current_val) / 25.0)

            # Bonus potentiel — constant chaque année
            bonus_base = max(0.0, (ml_score - 40) / 24)

            # Gain final : normatif × archetype × ceiling × potentiel + bonus
            adjusted_gain = float(np.clip(
                normative_gain * arch_mult * ceiling_factor * potential_multiplier + bonus_base,
                0.5,
                12.0
            ))

            new_score           = float(np.clip(current_val + adjusted_gain, 0, 99))
            adjusted_scores[dim] = new_score
            improvements[dim]    = round(adjusted_gain, 1)

        current_scores = adjusted_scores.copy()

        if round_scores:
            adjusted_scores = {k: int(round(v)) for k, v in adjusted_scores.items()}

        avg_imp = round(float(np.mean(list(improvements.values()))), 1)

        adjusted_projections[season] = {
            **proj_data,
            "scores":               adjusted_scores,
            "improvements":         {k: round(v, 1) for k, v in improvements.items()},
            "avg_improvement":      avg_imp,
            "ml_score":             round(ml_score, 1),
            "potential_multiplier": round(potential_multiplier, 2),
            "display_message": _build_projection_message(
                int(season.split("-")[0]),
                avg_imp,
                proj_data.get("archetype", "unknown"),
                proj_data["age"],
                proj_data["projection_basis"]["n_snapshots_used"],
            ) + f" Score potentiel IA : {ml_score:.0f}%.",
        }

    return adjusted_projections


def radar_scores_for_api_v2(
    player_id: str,
    df: pd.DataFrame,
    pipeline,
    used_features: list,
    years_ahead: int = 4,
) -> dict:
    """
    Version complète pour l'API avec projections liées au potentiel ML.
    À utiliser à la place de radar_scores_for_api quand le pipeline est disponible.
    """
    current     = compute_radar_scores(player_id, df, snapshot_index=-1)
    history     = compute_radar_history(player_id, df)
    projections = compute_radar_projection_v2(
        player_id, df, pipeline, used_features, years_ahead=years_ahead
    )

    if "error" in current:
        return current

    # Récupérer le ml_score depuis les projections
    ml_score = 50.0
    if projections and not isinstance(projections, dict) or "error" not in projections:
        first_proj = next(iter(projections.values()), {})
        ml_score   = first_proj.get("ml_score", 50.0)

    timeline = {}
    timeline.update(history)
    timeline.update(projections)

    return {
        "player_id":          player_id,
        "ml_score":           round(ml_score, 1),
        "current":            current,
        "history":            history,
        "projections":        projections,
        "timeline":           timeline,
    }