"""
uroom/synthetic.py
Générateur de données synthétiques réalistes pour le prototype Uroom.

Version 3 — bruit recalibré :
- Signal suffisant pour être appris (AUC cible : 0.68–0.76)
- Overlap réaliste entre classes (pas de séparation parfaite)
- Archetypes pro/non-pro conformes à la littérature (Leyhr et al. 2018)
- Biais de maturité simulé (Cumming et al. 2017)
- Split par joueur stratifié (pas temporel sur données synthétiques)
"""

import random
import numpy as np
from datetime import date, timedelta
from typing import Optional

from uroom.schemas import (
    Player, PlayerSnapshot, PhysicalMetrics, TechnicalMetrics,
    ScoutObservation, Position, Foot, CompetitionLevel
)

RNG = np.random.default_rng(seed=42)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))

def _noisy(value: float, std: float) -> float:
    return value + float(RNG.normal(0, std))


# ---------------------------------------------------------------------------
# Archetypes
#
# Pros (Leyhr et al. 2018) :
#   1. early_bloomer  : bon tôt, maintient (30%)
#   2. late_bloomer   : faible < 14 ans, explose ensuite (25%)
#   3. steady_climber : progression linéaire constante (35%)
#   4. inconsistent   : variable, perce tardivement (10%)
#
# Non-pros :
#   A. physical_dominant : domine physiquement jeune (biais maturité), plafonne
#   B. early_specialist  : bon techniquement jeune, ne progresse plus
#   C. average           : métriques correctes, ne perce pas
# ---------------------------------------------------------------------------

PRO_ARCHETYPES        = ["early_bloomer", "late_bloomer", "steady_climber", "inconsistent"]
PRO_ARCHETYPE_WEIGHTS = [0.30, 0.25, 0.35, 0.10]

NONPRO_ARCHETYPES        = ["physical_dominant", "early_specialist", "average"]
NONPRO_ARCHETYPE_WEIGHTS = [0.30, 0.25, 0.45]


def _get_pro_bonus(archetype: str, age: float) -> float:
    """
    Les pros ont un avantage réel mais pas écrasant.
    Le late_bloomer est le cas le plus difficile à détecter.
    """
    if archetype == "early_bloomer":
        return _clamp(_noisy(0.7, 0.20), 0.2, 1.2)        # clairement meilleur tôt

    elif archetype == "late_bloomer":
        if age < 13.5:
            return _clamp(_noisy(-0.1, 0.25), -0.5, 0.3)  # difficile à détecter
        elif age < 15.0:
            return _clamp(_noisy(0.4, 0.20), 0.0, 0.8)
        else:
            return _clamp(_noisy(0.8, 0.20), 0.3, 1.3)    # explose tardivement

    elif archetype == "steady_climber":
        base = 0.2 + (age - 11.0) / 6.0 * 0.8            # 0.2 à 11 ans → 1.0 à 17 ans
        return _clamp(_noisy(base, 0.20), -0.1, 1.2)

    else:  # inconsistent
        return _clamp(_noisy(0.2, 0.45), -0.5, 0.9)


def _get_nonpro_bonus(archetype: str, age: float) -> float:
    """
    Les non-pros peuvent avoir de bonnes métriques à certains âges,
    mais leur trajectoire diverge clairement après 14 ans.
    Clé : réduire le bonus des early_specialist pour éviter qu'ils
    ressemblent trop aux pros sur toutes les métriques.
    """
    if archetype == "physical_dominant":
        if age < 13.5:
            # Fort physiquement mais PAS techniquement
            return _clamp(_noisy(0.2, 0.25), -0.1, 0.5)
        elif age < 15.0:
            return _clamp(_noisy(0.0, 0.20), -0.3, 0.2)
        else:
            return _clamp(_noisy(-0.3, 0.20), -0.6, 0.0)  # plafonne clairement

    elif archetype == "early_specialist":
        if age < 13.0:
            return _clamp(_noisy(0.1, 0.20), -0.2, 0.4)   # correct mais pas exceptionnel
        else:
            return _clamp(_noisy(-0.2, 0.20), -0.5, 0.1)  # stagne puis régresse

    else:  # average
        return _clamp(_noisy(-0.3, 0.20), -0.6, 0.0)      # clairement en dessous


# ---------------------------------------------------------------------------
# Génération d'un joueur
# ---------------------------------------------------------------------------

def generate_player(player_id: str, is_pro: Optional[bool] = None) -> Player:
    positions     = list(Position)
    feet          = [Foot.RIGHT] * 6 + [Foot.LEFT] * 3 + [Foot.BOTH]
    academies     = [
        "Anderlecht Academy", "Club Brugge JO", "Standard Liège U",
        "Genk Youth", "RFC Seraing Jeunes", "Berchem Sport U",
        "Mouscron Youth", "Gent Academy",
    ]
    nationalities = ["BE"] * 5 + ["FR", "NL", "MA", "CD", "TR"]

    birth_year  = random.randint(2006, 2012)
    birth_month = random.randint(1, 12)
    birth_day   = random.randint(1, 28)

    return Player(
        player_id      = player_id,
        first_name     = f"Player{player_id[-3:]}",
        last_name      = f"Family{player_id[-2:]}",
        birth_date     = date(birth_year, birth_month, birth_day),
        position       = random.choice(positions),
        dominant_foot  = random.choice(feet),
        nationality    = random.choice(nationalities),
        academy        = random.choice(academies),
        is_pro         = is_pro,
    )


# ---------------------------------------------------------------------------
# Génération d'un snapshot
# ---------------------------------------------------------------------------

def generate_snapshot(
    player: Player,
    age: float,
    is_pro: bool,
    archetype: str,
    previous_snapshot: Optional[PlayerSnapshot] = None,
) -> PlayerSnapshot:

    bonus = (
        _get_pro_bonus(archetype, age)
        if is_pro
        else _get_nonpro_bonus(archetype, age)
    )

    # --- Maturité biologique simulée ---
    # PHV entre 12.5 et 14.5 ans (variance réaliste : Malina et al. 2015)
    phv_age          = float(RNG.normal(13.5, 0.8))
    growth_intensity = max(0.0, 1.0 - abs(age - phv_age) / 2.5)

    # --- Physique (std recalibré : signal présent, overlap maintenu) ---
    if age < 12.0:
      base_height = 138 + (age - 10.0) * 5.0
    elif age < 14.5:
      base_height = 148 + (age - 12.0) * 7.5
    elif age < 16.0:
      base_height = 167 + (age - 14.5) * 4.0
    else:
      base_height = 173 + (age - 16.0) * 1.5
    base_height += bonus * 0.8
    height = _clamp(_noisy(base_height, 4.0), 130, 200)
    

    base_weight    = height * 0.36 + age * 0.6
    weight         = _clamp(_noisy(base_weight, 3.0), 35, 90)

    sitting_height = _clamp(_noisy(height * 0.52, 1.5), 70, 100)

    # Sprint : corrélé à la maturité, pas au talent < U15
    sprint_10m = _clamp(_noisy(2.15 - age * 0.013 - bonus * 0.015, 0.07), 1.5, 2.8)
    sprint_30m = _clamp(_noisy(5.05 - age * 0.038 - bonus * 0.030, 0.15), 3.5, 6.5)

    # Jump/endurance : plus corrélés au talent
    jump       = _clamp(_noisy(28 + age * 1.4 + bonus * 3.0 + growth_intensity * 4, 3.5), 20, 70)
    endurance  = _clamp(_noisy(43 + age * 0.9 + bonus * 2.5, 3.5), 30, 72)

    physical = PhysicalMetrics(
        height_cm         = round(height, 1),
        weight_kg         = round(weight, 1),
        sitting_height_cm = round(sitting_height, 1),
        sprint_10m_sec    = round(sprint_10m, 3),
        sprint_30m_sec    = round(sprint_30m, 3),
        jump_cm           = round(jump, 1),
        endurance_score   = round(endurance, 1),
    )

    # --- Technique ---
    # base_tech : niveau de base selon l'age + signal pro amplifie
    base_tech = 45 + age * 1.5 + bonus * 8.0   # bonus amplifie : 6.5 -> 8.0
    matches   = random.randint(10, 28)

    technical = TechnicalMetrics(
        matches_played       = matches,
        minutes_played       = matches * random.randint(40, 90),
        pass_accuracy_pct    = _clamp(_noisy(base_tech + 4.0, 4.0), 35, 95),   # std 5.5->4.0
        dribble_success_pct  = _clamp(_noisy(base_tech - 6.0, 4.5), 20, 88),   # std 6.0->4.5
        shots_on_target_pct  = _clamp(_noisy(base_tech - 12.0, 5.5), 15, 82),  # std 7.0->5.5
        duels_won_pct        = _clamp(_noisy(base_tech, 4.0), 28, 76),          # std 5.5->4.0
        interceptions_per90  = _clamp(_noisy(2.2 + bonus * 0.5, 0.5), 0.3, 7.0),
        goals_per90          = _clamp(_noisy(0.28 + bonus * 0.15, 0.14), 0.0, 1.5),
        assists_per90        = _clamp(_noisy(0.22 + bonus * 0.12, 0.12), 0.0, 1.2),
    )

    # --- Observations scouts ---
    # Les scouts sont imparfaits mais pas inutiles (biais physique documenté)
    n_obs    = random.randint(1, 3)
    scout_obs = []
    snapshot_date = player.birth_date + timedelta(days=int(age * 365.25))

    for _ in range(n_obs):
        base_score = 4.5 + age * 0.12 + bonus * 2.8   # signal scout plus fort
        scout_bias = float(RNG.normal(0, 0.5))          # biais propre au scout

        obs = ScoutObservation(
            scout_id           = f"SCOUT_{random.randint(1, 12):02d}",
            observation_date   = snapshot_date - timedelta(days=random.randint(0, 120)),
            match_context      = f"Match saison {snapshot_date.year}",
            competition_level  = random.choice(list(CompetitionLevel)),
            technical_quality  = _clamp(_noisy(base_score + scout_bias, 1.1), 1, 10),
            physical_presence  = _clamp(_noisy(base_score + scout_bias - 0.2, 1.2), 1, 10),
            decision_making    = _clamp(_noisy(base_score + scout_bias + 0.3, 1.0), 1, 10),
            work_rate          = _clamp(_noisy(base_score + scout_bias, 0.9), 1, 10),
            leadership         = _clamp(_noisy(base_score + scout_bias - 0.4, 1.3), 1, 10),
            game_intelligence  = _clamp(_noisy(base_score + scout_bias + 0.2, 1.1), 1, 10),
            coachability       = _clamp(_noisy(base_score + scout_bias, 1.0), 1, 10),
        )
        scout_obs.append(obs)

    comp_level  = random.choice(list(CompetitionLevel))
    season_year = snapshot_date.year
    season      = f"{season_year - 1}-{str(season_year)[2:]}"

    return PlayerSnapshot(
        player_id          = player.player_id,
        snapshot_date      = snapshot_date,
        age                = age,
        season             = season,
        competition_level  = comp_level,
        physical           = physical,
        technical          = technical,
        scout_observations = scout_obs,
    )


# ---------------------------------------------------------------------------
# Dataset complet
# ---------------------------------------------------------------------------

def generate_dataset(
    n_players: int = 500,
    pro_ratio: float = 0.12,
    snapshots_per_player: int = 4,
) -> tuple[list[Player], list[PlayerSnapshot]]:
    """
    Génère un dataset réaliste v3.

    Paramètres par défaut :
    - 500 joueurs (minimum pour avoir ~12 pros dans le test à 20%)
    - 12% pros (réaliste pour une académie)
    - 4 snapshots/joueur (trajectoire longitudinale de 4 saisons)

    AUC cible : 0.68 – 0.76
    """
    n_pro   = int(n_players * pro_ratio)
    n_other = n_players - n_pro

    players   = []
    snapshots = []

    pro_archetypes    = random.choices(PRO_ARCHETYPES,    PRO_ARCHETYPE_WEIGHTS,    k=n_pro)
    nonpro_archetypes = random.choices(NONPRO_ARCHETYPES, NONPRO_ARCHETYPE_WEIGHTS, k=n_other)

    all_is_pro     = [True] * n_pro + [False] * n_other
    all_archetypes = pro_archetypes + nonpro_archetypes

    combined = list(zip(all_is_pro, all_archetypes))
    random.shuffle(combined)

    for i, (is_pro, archetype) in enumerate(combined):
        pid    = f"P{i+1:04d}"
        player = generate_player(pid, is_pro=is_pro)
        players.append(player)

        start_age     = round(random.uniform(11.0, 13.5), 1)
        prev_snapshot = None

        for j in range(snapshots_per_player):
            age      = round(start_age + j, 1)
            snapshot = generate_snapshot(player, age, is_pro, archetype, prev_snapshot)
            snapshots.append(snapshot)
            prev_snapshot = snapshot

    n_pro_actual = sum(1 for p in players if p.is_pro)
    print(f"Dataset v3 généré : {len(players)} joueurs "
          f"({n_pro_actual} pros [{pro_ratio:.0%}], "
          f"{len(players) - n_pro_actual} non-pros)")
    print(f"Total snapshots   : {len(snapshots)}")
    print(f"Archetypes pros     : {dict(zip(*np.unique(pro_archetypes, return_counts=True)))}")
    print(f"Archetypes non-pros : {dict(zip(*np.unique(nonpro_archetypes, return_counts=True)))}")

    return players, snapshots