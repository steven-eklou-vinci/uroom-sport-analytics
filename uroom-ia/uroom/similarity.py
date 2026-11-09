"""
uroom/similarity.py
Similarité entre profils de jeunes joueurs et profils pros historiques.

Méthode : Distance de Mahalanobis (Mahalanobis, 1936)
Validée en sports analytics : Ali et al. (2007), Brechot & Flepp (2020)

Pipeline :
1. Construire une base de profils pros historiques (référence)
2. Pour un joueur cible, calculer sa distance à chaque pro
3. Retourner les K plus proches voisins avec score de similarité

Avec SoFIFA : on compare maintenant des jeunes à des pros AU MÊME ÂGE
(Mbappé à 18 ans, De Bruyne à 20 ans, etc.) — beaucoup plus pertinent.
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass
from scipy.spatial.distance import mahalanobis
from scipy.linalg import inv
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from typing import Optional
from pathlib import Path


# ---------------------------------------------------------------------------
# Features utilisées pour la similarité
# ---------------------------------------------------------------------------

SIMILARITY_FEATURES = [
    "pass_accuracy_pct",
    "duels_won_pct",
    "goals_per90",
    "assists_per90",
    "interceptions_per90",
    "dribble_success_pct",
    "competition_level",
]


@dataclass
class SimilarityResult:
    """Résultat de similarité entre un joueur cible et un pro de référence."""
    pro_player_id:    str
    pro_name:         str
    pro_age_at_match: float
    similarity_score: float   # 0 → 100
    mahalanobis_dist: float
    matched_features: dict


# ---------------------------------------------------------------------------
# Base de profils pros
# ---------------------------------------------------------------------------

class ProProfileDatabase:
    """
    Base de données de profils pros.
    Supporte StatsBomb (adultes) + SoFIFA (jeunes 16-22 ans).
    """

    def __init__(self):
        self.profiles: list[dict] = []
        self.scaler   = StandardScaler()
        self.imputer  = SimpleImputer(strategy="median")
        self._cov_inv: Optional[np.ndarray] = None
        self._feature_cols: list[str] = []
        self._fitted = False
        self._typical_distance = 3.0
        self._p95_distance     = 6.0

    def add_profile(self, player_id: str, name: str, age: float, features: dict):
        profile = {"player_id": player_id, "name": name, "age": age}
        profile.update(features)
        self.profiles.append(profile)

    def build_from_dataframe(self, df: pd.DataFrame, name_col: str = "player_id"):
        df_pros = df[df["is_pro"] == 1].copy()
        if df_pros.empty:
            raise ValueError("Aucun joueur pro dans le DataFrame fourni.")
        for _, row in df_pros.iterrows():
            features = {f: row[f] for f in SIMILARITY_FEATURES if f in row.index}
            self.add_profile(
                player_id = str(row["player_id"]),
                name      = str(row.get(name_col, row["player_id"])),
                age       = float(row["age"]),
                features  = features,
            )
        print(f"Base de référence : {len(self.profiles)} snapshots pros "
              f"({df_pros['player_id'].nunique()} joueurs uniques)")

    def fit(self):
        if not self.profiles:
            raise ValueError("Base vide.")

        df_ref = pd.DataFrame(self.profiles)
        candidate_cols = [
            f for f in SIMILARITY_FEATURES
            if f in df_ref.columns and df_ref[f].notna().sum() > 5
        ]
        stds = df_ref[candidate_cols].astype(float).std(ddof=0)
        self._feature_cols = [f for f in candidate_cols if float(stds.get(f, 0.0)) > 1e-6]
        dropped = [f for f in candidate_cols if f not in self._feature_cols]
        if dropped:
            print(f"Features ignorées (variance nulle/quasi nulle) : {dropped}")

        X = df_ref[self._feature_cols].values.astype(float)
        X = self.imputer.fit_transform(X)
        X = self.scaler.fit_transform(X)

        cov     = np.cov(X, rowvar=False)
        cov_reg = cov + 1e-4 * np.eye(cov.shape[0])
        try:
            self._cov_inv = inv(cov_reg)
        except np.linalg.LinAlgError:
            self._cov_inv = np.linalg.pinv(cov_reg)

        # Calibrer sur la distribution réelle
        try:
            sample_size = min(200, len(X))
            sample      = X[:sample_size]
            dists = []
            for i in range(min(80, sample_size)):
                for j in range(i+1, min(80, sample_size)):
                    try:
                        d = mahalanobis(sample[i], sample[j], self._cov_inv)
                        if np.isfinite(d) and d > 0:
                            dists.append(d)
                    except:
                        pass
            self._typical_distance = float(np.median(dists)) if dists else 3.0
            self._p95_distance     = float(np.percentile(dists, 95)) if dists else 6.0
            print(f"Modèle similarité : {len(self.profiles):,} profils, "
                  f"{len(self._feature_cols)} features")
            print(f"Distance médiane : {self._typical_distance:.2f} | p95 : {self._p95_distance:.2f}")
        except:
            self._typical_distance = 3.0
            self._p95_distance     = 6.0

        self._fitted = True

    def _dist_to_similarity(self, dist: float) -> float:
        """Convertit distance Mahalanobis → score 0-100."""
        sigma = max(self._typical_distance, 0.5)
        score = 100 * np.exp(-(dist ** 2) / (2 * sigma ** 2))
        return float(np.clip(round(score, 1), 0, 100))

    def find_similar_pros(
        self,
        target_features: dict,
        top_k: int = 5,
        age_window: Optional[float] = None,
        target_age: Optional[float] = None,
        position_filter: Optional[str] = None,
    ) -> list[SimilarityResult]:
        """
        Trouve les K pros les plus similaires au profil cible.

        Args:
            target_features:  dict des features du joueur cible
            top_k:            nombre de résultats
            age_window:       si défini, filtre les pros dans target_age ± age_window
            target_age:       âge du joueur cible (pour le filtre)
            position_filter:  filtre par groupe de position ('MID', 'DEF', 'FWD')
        """
        if not self._fitted:
            raise RuntimeError("Appelle fit() d'abord.")

        available = [f for f in self._feature_cols if f in target_features]
        if not available:
            return []

        # Vecteur cible
        target_vec = np.array([
            float(target_features.get(f, 0)) for f in self._feature_cols
        ]).reshape(1, -1)
        target_vec = self.imputer.transform(target_vec)
        target_vec = self.scaler.transform(target_vec)

        df_ref = pd.DataFrame(self.profiles)

        # Filtre âge
        if age_window is not None and target_age is not None:
            mask = (df_ref["age"] >= target_age - age_window) & \
                   (df_ref["age"] <= target_age + age_window)
            df_ref = df_ref[mask]

        # Filtre position (si disponible dans la base)
        if position_filter and "position_group" in df_ref.columns:
            df_ref = df_ref[df_ref["position_group"] == position_filter]

        if df_ref.empty:
            return []

        results = []
        ref_matrix = df_ref[self._feature_cols].values.astype(float)
        ref_matrix = self.imputer.transform(ref_matrix)
        ref_matrix = self.scaler.transform(ref_matrix)

        for idx, (_, pro_row) in enumerate(df_ref.iterrows()):
            try:
                ref_vec = ref_matrix[idx]
                dist    = float(mahalanobis(target_vec[0], ref_vec, self._cov_inv))
                if not np.isfinite(dist):
                    continue
                sim = self._dist_to_similarity(dist)
                results.append(SimilarityResult(
                    pro_player_id    = str(pro_row["player_id"]),
                    pro_name         = str(pro_row["name"]),
                    pro_age_at_match = float(pro_row.get("age", 20)),
                    similarity_score = sim,
                    mahalanobis_dist = round(dist, 3),
                    matched_features = {
                        f: float(pro_row.get(f, 0)) for f in available
                    },
                ))
            except Exception:
                continue

        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results[:top_k]


# ---------------------------------------------------------------------------
# Chargement depuis StatsBomb CSV
# ---------------------------------------------------------------------------

def load_pro_reference_database(
    df_train           = None,
    csv_path: str      = "data/raw/pro_reference_database_clean.csv",
    also_add_synthetic: bool = False,
    verbose: bool      = True,
) -> ProProfileDatabase:
    """Charge la base StatsBomb + optionnellement les pros synthétiques."""
    db = ProProfileDatabase()

    csv_p = Path(csv_path)
    if csv_p.exists():
        df_csv = pd.read_csv(csv_p)
        df_csv = df_csv[
            (df_csv["pass_accuracy_pct"].between(30, 97)) &
            (df_csv["duels_won_pct"].fillna(50).between(5, 95))
        ]
        for _, row in df_csv.iterrows():
            features = {}
            for col in SIMILARITY_FEATURES:
                if col in row and not pd.isna(row[col]):
                    features[col] = float(row[col])
            if len(features) < 3:
                continue
            name = f"{row.get('player_name','Pro')} ({row.get('competition','')})"
            db.add_profile(
                player_id = str(row.get("player_id", f"SB_{len(db.profiles)}")),
                name      = name,
                age       = 25.0,
                features  = features,
            )
        if verbose:
            print(f"StatsBomb : {len(df_csv):,} profils chargés depuis {csv_path}")
    else:
        if verbose:
            print(f"CSV StatsBomb introuvable : {csv_path}")

    if also_add_synthetic and df_train is not None:
        df_pros = df_train[df_train["is_pro"] == 1]
        for _, row in df_pros.iterrows():
            features = {f: row[f] for f in SIMILARITY_FEATURES if f in row.index}
            db.add_profile(
                player_id = str(row["player_id"]),
                name      = f"Profil académie #{row['player_id']}",
                age       = float(row["age"]),
                features  = features,
            )
        if verbose:
            print(f"+ {len(df_pros)} pros synthétiques ajoutés")

    db.fit()
    return db


# ---------------------------------------------------------------------------
# Chargement SoFIFA CSV → ProProfileDatabase
# ---------------------------------------------------------------------------

def load_sofifa_pro_database(
    sofifa_csv: str = "data/raw/sofifa_young_pros.csv",
    min_overall: int = 65,
    verbose: bool = True,
) -> ProProfileDatabase:
    """
    Charge la base SoFIFA (jeunes pros 16-22 ans) dans ProProfileDatabase.

    C'est la base recommandée pour la comparaison avec les jeunes joueurs
    car elle contient des profils de pros AU MÊME ÂGE que nos joueurs.

    Args:
        sofifa_csv:  chemin vers le CSV généré par build_sofifa_csv_database()
        min_overall: filtre qualité minimum (défaut 65 — joueurs de niveau pro confirmé)
        verbose:     afficher la progression
    """
    db   = ProProfileDatabase()
    path = Path(sofifa_csv)

    if not path.exists():
        if verbose:
            print(f"CSV SoFIFA introuvable : {path}")
            print("Lance d'abord : python -m uroom.sofifa_csv_loader")
        return db

    df = pd.read_csv(path)

    # Filtre qualité
    if "fifa_overall" in df.columns:
        df = df[df["fifa_overall"] >= min_overall]

    if verbose:
        print(f"SoFIFA : {len(df):,} profils (overall >= {min_overall})")

    for _, row in df.iterrows():
        features = {}
        for col in SIMILARITY_FEATURES:
            if col in row and not pd.isna(row[col]):
                features[col] = float(row[col])
        if len(features) < 3:
            continue

        fifa_v = int(row.get("fifa_version", 25))
        age    = int(row.get("age", 19))
        year   = 1999 + fifa_v if fifa_v <= 24 else 2023 + (fifa_v - 24)
        name   = f"{row['player_name']} (FIFA {fifa_v}, {age} ans)"

        db.add_profile(
            player_id      = f"SFX_{row['player_id']}_a{age}",
            name           = name,
            age            = float(age),
            features       = features,
            # position_group stocké pour filtre optionnel
        )

        # Stocker position_group dans le dernier profil ajouté
        if "position_group" in row and not pd.isna(row.get("position_group", "")):
            db.profiles[-1]["position_group"] = str(row["position_group"])

    db.fit()
    if verbose:
        print(f"Base SoFIFA prête : {len(db.profiles):,} profils jeunes de pros")
    return db


# ---------------------------------------------------------------------------
# Base combinée SoFIFA + StatsBomb
# ---------------------------------------------------------------------------

def load_combined_pro_database(
    sofifa_csv:    str = "data/raw/sofifa_young_pros.csv",
    statsbomb_csv: str = "data/raw/pro_reference_database_clean.csv",
    sofifa_min_overall: int = 65,
    verbose: bool = True,
) -> ProProfileDatabase:
    """
    Base combinée recommandée pour la production :
    - SoFIFA : profils jeunes 16-22 ans → comparaison pertinente avec académies
    - StatsBomb : stats réelles adultes → contexte de haut niveau

    En priorité : SoFIFA pour la comparaison par âge.
    """
    db          = ProProfileDatabase()
    total_added = 0

    # 1. SoFIFA — jeunes pros (source principale)
    sofifa_path = Path(sofifa_csv)
    if sofifa_path.exists():
        df_sof = pd.read_csv(sofifa_path)
        if "fifa_overall" in df_sof.columns:
            df_sof = df_sof[df_sof["fifa_overall"] >= sofifa_min_overall]

        for _, row in df_sof.iterrows():
            features = {}
            for col in SIMILARITY_FEATURES:
                if col in row and not pd.isna(row[col]):
                    features[col] = float(row[col])
            if len(features) < 3:
                continue

            fifa_v = int(row.get("fifa_version", 25))
            age    = int(row.get("age", 19))
            name   = f"{row['player_name']} (FIFA {fifa_v}, {age} ans)"

            profile = {
                "player_id": f"SFX_{row['player_id']}_a{age}",
                "name":      name,
                "age":       float(age),
            }
            profile.update(features)
            if "position_group" in row and not pd.isna(row.get("position_group", "")):
                profile["position_group"] = str(row["position_group"])
            db.profiles.append(profile)
            total_added += 1

        if verbose:
            print(f"SoFIFA    : {len(df_sof):,} profils jeunes (16-22 ans, overall >= {sofifa_min_overall})")
    else:
        if verbose:
            print(f"SoFIFA CSV introuvable — ignoré ({sofifa_path})")

    # 2. StatsBomb — stats réelles adultes (source complémentaire)
    sb_path = Path(statsbomb_csv)
    if sb_path.exists():
        df_sb = pd.read_csv(sb_path)
        df_sb = df_sb[
            (df_sb["pass_accuracy_pct"].between(30, 97)) &
            (df_sb["duels_won_pct"].fillna(50).between(5, 95))
        ]
        for _, row in df_sb.iterrows():
            features = {}
            for col in SIMILARITY_FEATURES:
                if col in row and not pd.isna(row[col]):
                    features[col] = float(row[col])
            if len(features) < 3:
                continue
            profile = {
                "player_id": f"SB_{row.get('player_id', total_added)}",
                "name":      f"{row.get('player_name','Pro')} ({row.get('competition','')})",
                "age":       25.0,
            }
            profile.update(features)
            db.profiles.append(profile)
            total_added += 1
        if verbose:
            print(f"StatsBomb : {len(df_sb):,} profils adultes")
    else:
        if verbose:
            print(f"StatsBomb CSV introuvable — ignoré ({sb_path})")

    if not db.profiles:
        if verbose:
            print("Base vide — vérifie les chemins des CSV")
        return db

    db.fit()
    if verbose:
        print(f"\nBase combinée : {total_added:,} profils total")
    return db


# ---------------------------------------------------------------------------
# Rapport de similarité
# ---------------------------------------------------------------------------

def build_similarity_report(
    player_id:  str,
    df:         pd.DataFrame,
    pro_db:     ProProfileDatabase,
    top_k:      int   = 5,
    age_window: Optional[float] = 2.0,
) -> dict:
    """
    Génère un rapport de similarité pour chaque snapshot d'un joueur.

    Avec age_window=2.0 : compare le joueur à des pros qui avaient le même âge ± 2 ans.
    Avec age_window=None : comparaison de style de jeu sans contrainte d'âge.

    Recommandation avec SoFIFA : utiliser age_window=2.0 pour des comparaisons
    pertinentes (un joueur de 17 ans comparé à des pros à 15-19 ans).
    """
    player_df = df[df["player_id"] == player_id].sort_values("age")
    if player_df.empty:
        return {"error": f"Joueur {player_id} introuvable."}

    # Détecter la position du joueur pour le filtre optionnel
    position_group = None
    if "position" in player_df.columns:
        pos = str(player_df["position"].iloc[-1])
        pos_map = {"MID": "MID", "DEF": "DEF", "FWD": "FWD", "GK": "GK"}
        position_group = pos_map.get(pos)

    report = {"player_id": player_id, "snapshots": []}

    for _, snap in player_df.iterrows():
        features   = {f: snap.get(f) for f in SIMILARITY_FEATURES if f in snap.index}
        target_age = float(snap.get("age", 15))

        similar_pros = pro_db.find_similar_pros(
            target_features = features,
            top_k           = top_k,
            age_window      = age_window,
            target_age      = target_age if age_window else None,
        )

        report["snapshots"].append({
            "age":         round(target_age, 1),
            "season":      snap.get("season", ""),
            "similar_pros": similar_pros,
        })

    return report


def print_similarity_report(report: dict, df: pd.DataFrame):
    """Affiche le rapport de similarité."""
    if "error" in report:
        print(report["error"])
        return

    pid    = report["player_id"]
    is_pro = df[df["player_id"] == pid]["is_pro"].iloc[0] \
             if not df[df["player_id"] == pid].empty else "?"

    print(f"\n{'='*55}")
    print(f"RAPPORT DE SIMILARITÉ — Joueur {pid}")
    print(f"Statut réel : {'PRO ✓' if is_pro == 1 else 'Non-pro'}")
    print(f"{'='*55}")

    for snap in report["snapshots"]:
        print(f"\n  Snapshot à {snap['age']:.1f} ans (saison {snap['season']}) :")
        if not snap["similar_pros"]:
            print("    Aucun pro similaire trouvé.")
            continue
        for i, res in enumerate(snap["similar_pros"], 1):
            bar = "█" * int(res.similarity_score / 10)
            print(f"    {i}. {res.pro_name:<35} "
                  f"(âge {res.pro_age_at_match:.0f}) "
                  f"similarité={res.similarity_score:5.1f}% {bar}")


# ---------------------------------------------------------------------------
# Score de trajectoire longitudinal
# ---------------------------------------------------------------------------

def compute_trajectory_similarity(
    player_id:  str,
    df:         pd.DataFrame,
    pro_db:     ProProfileDatabase,
    age_window: Optional[float] = 2.0,
) -> dict:
    """
    Score de similarité de trajectoire — compare l'évolution du joueur dans le temps.
    Avec SoFIFA, utilise age_window=2.0 pour comparer à des pros au même âge.
    """
    snapshots = df[df["player_id"] == player_id].sort_values("age")
    if snapshots.empty:
        return {"error": f"Joueur {player_id} introuvable."}

    scores_by_snapshot = []
    best_matches       = []
    ages               = []

    for _, snap in snapshots.iterrows():
        features   = {f: snap.get(f) for f in SIMILARITY_FEATURES if f in snap.index}
        target_age = float(snap.get("age", 15))
        similar    = pro_db.find_similar_pros(
            features,
            top_k      = 1,
            age_window = age_window,
            target_age = target_age if age_window else None,
        )
        if similar:
            scores_by_snapshot.append(similar[0].similarity_score)
            best_matches.append(similar[0])
            ages.append(target_age)

    if not scores_by_snapshot:
        return {"trajectory_score": 0.0, "trend": "unknown", "best_match_overall": None}

    # Pondération : snapshots récents comptent plus
    weights = np.array([1.0 + i * 0.5 for i in range(len(scores_by_snapshot))])
    weights /= weights.sum()
    trajectory_score = float(np.average(scores_by_snapshot, weights=weights))

    # Trend
    if len(scores_by_snapshot) >= 2:
        slope = np.polyfit(range(len(scores_by_snapshot)), scores_by_snapshot, 1)[0]
        trend = "improving" if slope > 1.0 else ("declining" if slope < -1.0 else "stable")
    else:
        trend = "insufficient_data"

    best_idx   = int(np.argmax(scores_by_snapshot))
    best_match = best_matches[best_idx]

    return {
        "trajectory_score":   round(trajectory_score, 1),
        "trend":              trend,
        "scores_by_snapshot": list(zip(ages, scores_by_snapshot)),
        "best_match_overall": best_match,
    }


# ---------------------------------------------------------------------------
# Ancienne base de référence fictive — conservée pour compatibilité
# ---------------------------------------------------------------------------

REFERENCE_PRO_PROFILES = [
    {"id": "REF_001", "name": "Pedri (FC Barcelone B, 16 ans)",      "age": 16.0, "pass_accuracy_pct": 81.0, "duels_won_pct": 58.0, "goals_per90": 0.08, "assists_per90": 0.22, "interceptions_per90": 1.8, "dribble_success_pct": 62.0, "competition_level": 2},
    {"id": "REF_002", "name": "Gavi (FC Barcelone B, 16 ans)",       "age": 16.0, "pass_accuracy_pct": 83.0, "duels_won_pct": 62.0, "goals_per90": 0.06, "assists_per90": 0.18, "interceptions_per90": 2.1, "dribble_success_pct": 65.0, "competition_level": 2},
    {"id": "REF_003", "name": "Bellingham (Birmingham, 16 ans)",     "age": 16.0, "pass_accuracy_pct": 76.0, "duels_won_pct": 67.0, "goals_per90": 0.12, "assists_per90": 0.15, "interceptions_per90": 2.5, "dribble_success_pct": 58.0, "competition_level": 3},
    {"id": "REF_004", "name": "Yamal (FC Barcelone B, 14 ans)",      "age": 14.0, "pass_accuracy_pct": 79.0, "duels_won_pct": 55.0, "goals_per90": 0.18, "assists_per90": 0.25, "interceptions_per90": 1.2, "dribble_success_pct": 70.0, "competition_level": 2},
    {"id": "REF_005", "name": "M. Camavinga (Rennes, 16 ans)",       "age": 16.0, "pass_accuracy_pct": 78.0, "duels_won_pct": 65.0, "goals_per90": 0.10, "assists_per90": 0.12, "interceptions_per90": 2.8, "dribble_success_pct": 60.0, "competition_level": 2},
]

def build_reference_database(also_add_synthetic_pros: bool = True,
                              df_synthetic: pd.DataFrame = None) -> ProProfileDatabase:
    db = ProProfileDatabase()
    for p in REFERENCE_PRO_PROFILES:
        features = {k: v for k, v in p.items() if k not in ("id", "name", "age")}
        db.add_profile(player_id=p["id"], name=p["name"], age=p["age"], features=features)
    if also_add_synthetic_pros and df_synthetic is not None:
        df_pros = df_synthetic[df_synthetic["is_pro"] == 1]
        for _, row in df_pros.iterrows():
            features = {f: row[f] for f in SIMILARITY_FEATURES if f in row.index}
            db.add_profile(str(row["player_id"]), f"Profil #{row['player_id']}", float(row["age"]), features)
    db.fit()
    return db
