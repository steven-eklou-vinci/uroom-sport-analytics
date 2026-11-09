"""
uroom/schemas.py
Définition des structures de données du projet Uroom Sports Analytics.
Toutes les entités métier sont modélisées ici comme dataclasses.
"""

from __future__ import annotations  # ← ajoute cette ligne en tout premier

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Optional, List  # ← ajoute List ici


# ---------------------------------------------------------------------------
# Énumérations métier
# ---------------------------------------------------------------------------

class Position(str, Enum):
  GOALKEEPER  = "GK"
  DEFENDER    = "DEF"
  MIDFIELDER  = "MID"
  FORWARD     = "FWD"


class Foot(str, Enum):
  RIGHT = "right"
  LEFT  = "left"
  BOTH  = "both"


class CompetitionLevel(int, Enum):
  """
  Niveau de la compétition observée.
  1 = national élite, 5 = district. Utilisé pour pondérer les performances.
  """
  NATIONAL_ELITE = 1
  NATIONAL       = 2
  REGIONAL_1     = 3
  REGIONAL_2     = 4
  DISTRICT       = 5


# ---------------------------------------------------------------------------
# Entité joueur (données statiques — ne changent pas ou peu)
# ---------------------------------------------------------------------------

@dataclass
class Player:
  player_id:    str
  first_name:   str
  last_name:    str
  birth_date:   date
  position:     Position
  dominant_foot: Foot
  nationality:  str
  academy:      str                  # nom de l'académie / club formateur
  is_pro:       Optional[bool] = None  # label final (connu a posteriori)

  @property
  def full_name(self) -> str:
    return f"{self.first_name} {self.last_name}"

  def age_at(self, reference_date: date) -> float:
    """Retourne l'âge décimal du joueur à une date donnée."""
    delta = reference_date - self.birth_date
    return round(delta.days / 365.25, 2)


# ---------------------------------------------------------------------------
# Métriques physiques (mesurées en test physique, ~2x/an)
# ---------------------------------------------------------------------------

@dataclass
class PhysicalMetrics:
  height_cm:         float
  weight_kg:         float
  sitting_height_cm: float = 0.0   # ← nouveau (0.0 = non mesuré)
  sprint_10m_sec:    float = 0.0
  sprint_30m_sec:    float = 0.0
  jump_cm:           float = 0.0
  endurance_score:   float = 0.0

  @property
  def bmi(self) -> float:
    return round(self.weight_kg / (self.height_cm / 100) ** 2, 2)


# ---------------------------------------------------------------------------
# Métriques techniques (agrégées sur une période, issues des matchs/sessions)
# ---------------------------------------------------------------------------

@dataclass
class TechnicalMetrics:
  matches_played:       int
  minutes_played:       int
  pass_accuracy_pct:    float    # % passes réussies
  dribble_success_pct:  float    # % dribbles réussis
  shots_on_target_pct:  float    # % tirs cadrés
  duels_won_pct:        float    # % duels gagnés
  interceptions_per90:  float    # interceptions par 90 min
  goals_per90:          float    # buts par 90 min
  assists_per90:        float    # passes décisives par 90 min


# ---------------------------------------------------------------------------
# Observation scout (évaluation qualitative, notée sur 10)
# ---------------------------------------------------------------------------

@dataclass
class ScoutObservation:
  scout_id:           str
  observation_date:   date
  match_context:      str              # description du match observé
  competition_level:  CompetitionLevel

  # Notes sur 10 (1=très faible, 10=exceptionnel)
  technical_quality:  float
  physical_presence:  float
  decision_making:    float
  work_rate:          float
  leadership:         float
  game_intelligence:  float
  coachability:       float            # aptitude à progresser sous coaching

  notes: str = ""                      # commentaire libre du scout

  @property
  def global_score(self) -> float:
    """Score global pondéré — la décision et l'intelligence comptent plus."""
    weights = {
      "technical_quality":  0.20,
      "physical_presence":  0.10,
      "decision_making":    0.20,
      "work_rate":          0.15,
      "leadership":         0.10,
      "game_intelligence":  0.15,
      "coachability":       0.10,
    }
    return round(
        self.technical_quality  * weights["technical_quality"]  +
        self.physical_presence  * weights["physical_presence"]  +
        self.decision_making    * weights["decision_making"]    +
        self.work_rate          * weights["work_rate"]          +
        self.leadership         * weights["leadership"]         +
        self.game_intelligence  * weights["game_intelligence"]  +
        self.coachability       * weights["coachability"],
        2
    )


# ---------------------------------------------------------------------------
# Snapshot — unité centrale du dataset ML
# Un snapshot = un joueur à un moment précis de son développement
# ---------------------------------------------------------------------------

@dataclass
class PlayerSnapshot:
  """
  Représente l'état complet d'un joueur à un instant T (typiquement : fin de saison).
  C'est la ligne de base du dataset d'entraînement ML.
  """
  player_id:    str
  snapshot_date: date
  age:          float               # âge décimal au moment du snapshot
  season:       str                 # ex: "2022-23"
  competition_level: CompetitionLevel

  physical:     PhysicalMetrics
  technical:    TechnicalMetrics
  # Après (compatible Python 3.8)
  scout_observations: List[ScoutObservation] = field(default_factory=list)

  @property
  def avg_scout_score(self) -> Optional[float]:
    if not self.scout_observations:
      return None
    return round(
        sum(o.global_score for o in self.scout_observations) / len(self.scout_observations),
        2
    )

  @property
  def scout_observation_count(self) -> int:
    return len(self.scout_observations)
  
