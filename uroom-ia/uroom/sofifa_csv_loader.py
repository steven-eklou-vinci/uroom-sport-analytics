"""
uroom/sofifa_csv_loader.py

Construit la base de référence pros depuis les CSV FIFA/FC (Kaggle dataset).

Sources :
    data/raw/sofifa/FC15-24.csv  — FIFA 15 à FC 24 (multi-années, colonne fifa_version)
    data/raw/sofifa/FC25.csv     — FC 25
    data/raw/sofifa/FC26.csv     — FC 26

Stratégie :
    - Filtrer les joueurs entre 16 et 22 ans sur chaque édition
    - Mapper les attributs FIFA vers nos features Uroom
    - Garder 1 ligne par joueur × version (dédupliquer les updates)
    - Exporter data/raw/sofifa_young_pros.csv

Usage :
    python -m uroom.sofifa_csv_loader

Ou depuis le notebook :
    from uroom.sofifa_csv_loader import build_sofifa_csv_database
    df = build_sofifa_csv_database()
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

DATA_DIR    = Path("data/raw/sofifa")
OUTPUT_PATH = Path("data/raw/sofifa_young_pros.csv")

# ---------------------------------------------------------------------------
# Mapping positions FIFA → position_group Uroom
# Garde aussi la position détaillée
# ---------------------------------------------------------------------------

POS_TO_GROUP = {
    "GK":  "GK",
    "SW":  "DEF", "RWB": "DEF", "RB":  "DEF", "RCB": "DEF",
    "CB":  "DEF", "LCB": "DEF", "LB":  "DEF", "LWB": "DEF",
    "RDM": "MID", "CDM": "MID", "LDM": "MID", "RM":  "MID",
    "RCM": "MID", "CM":  "MID", "LCM": "MID", "LM":  "MID",
    "RAM": "MID", "CAM": "MID", "LAM": "MID",
    "RF":  "FWD", "CF":  "FWD", "LF":  "FWD", "RW":  "FWD",
    "RS":  "FWD", "ST":  "FWD", "LS":  "FWD", "LW":  "FWD",
}

def get_primary_position(pos_string: str) -> tuple[str, str]:
    """
    Extrait la position principale depuis une chaîne type 'CM, CAM, CDM'.
    Retourne (position_detail, position_group).
    """
    if not isinstance(pos_string, str) or not pos_string.strip():
        return "CM", "MID"
    primary = pos_string.split(",")[0].strip()
    group   = POS_TO_GROUP.get(primary, "MID")
    return primary, group


# ---------------------------------------------------------------------------
# Conversion FIFA ratings → features Uroom
# ---------------------------------------------------------------------------

def fifa_to_uroom(row: pd.Series, fifa_version: int) -> dict:
    """
    Convertit les attributs FIFA en features Uroom normalisées.

    Mapping calibré :
    - pass_accuracy_pct    : short_passing (70%) + long_passing (30%) → échelle 45-90%
    - dribble_success_pct  : skill_dribbling (60%) + ball_control (40%) → 25-78%
    - shots_on_target_pct  : finishing (60%) + shot_power (40%) → 15-60%
    - duels_won_pct        : standing_tackle (40%) + aggression (30%) + heading (30%) → 25-68%
    - interceptions_per90  : interceptions → 0.3-5.0
    - goals_per90          : positioning (50%) + finishing (50%) → 0.0-0.7
    - assists_per90        : vision (60%) + crossing (40%) → 0.0-0.55
    - sprint_30m_sec       : sprint_speed → 3.8-5.1s (inversé)
    - endurance_score      : stamina → 35-68
    - jump_cm              : jumping → 22-55cm
    """

    def g(col: str, default: int = 50) -> int:
        """Get attribute with fallback."""
        val = row.get(col)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return default
        return int(val)

    # Attributs de base — gestion des deux formats de noms de colonnes
    short_pass   = g("attacking_short_passing") or g("short_passing")
    long_pass    = g("skill_long_passing")      or g("long_passing")
    ball_ctrl    = g("skill_ball_control")      or g("ball_control")
    skill_drib   = g("skill_dribbling")         or g("dribbling", 50)
    finishing    = g("attacking_finishing")     or g("finishing")
    shot_power   = g("power_shot_power")        or g("shot_power")
    sprint_spd   = g("movement_sprint_speed")   or g("sprint_speed")
    stamina      = g("power_stamina")           or g("stamina")
    jumping      = g("power_jumping")           or g("jumping")
    interc       = g("mentality_interceptions") or g("interceptions")
    vision       = g("mentality_vision")        or g("vision")
    aggression   = g("mentality_aggression")    or g("aggression")
    positioning  = g("mentality_positioning")   or g("positioning")
    crossing     = g("attacking_crossing")      or g("crossing")
    heading      = g("attacking_heading_accuracy") or g("heading")
    stand_tackle = g("defending_standing_tackle") or g("standing_tackle")

    # Pass accuracy %
    pass_rating  = short_pass * 0.7 + long_pass * 0.3
    pass_acc     = round(pass_rating / 99 * 45 + 45, 1)   # 45-90%

    # Dribble %
    drib_rating  = skill_drib * 0.6 + ball_ctrl * 0.4
    dribble_pct  = round(drib_rating / 99 * 53 + 25, 1)   # 25-78%

    # Tirs cadrés %
    shot_rating  = finishing * 0.6 + shot_power * 0.4
    shots_ot     = round(shot_rating / 99 * 45 + 15, 1)   # 15-60%

    # Duels gagnés %
    duel_rating  = stand_tackle * 0.4 + aggression * 0.3 + heading * 0.3
    duels_pct    = round(duel_rating / 99 * 43 + 25, 1)   # 25-68%

    # Interceptions / 90
    interc_per90 = round(interc / 99 * 4.7 + 0.3, 2)      # 0.3-5.0

    # Goals / 90
    goals_per90  = round((positioning * 0.5 + finishing * 0.5) / 99 * 0.7, 3)  # 0-0.7

    # Assists / 90
    assists_per90 = round((vision * 0.6 + crossing * 0.4) / 99 * 0.55, 3)      # 0-0.55

    # Sprint 30m (inversé : plus rapide = score plus bas)
    sprint_30m   = round(5.1 - (sprint_spd / 99) * 1.3, 3)  # 3.8-5.1s

    # Endurance
    endurance    = round(stamina / 99 * 33 + 35, 1)           # 35-68

    # Détente verticale
    jump_cm      = round(jumping / 99 * 33 + 22, 1)           # 22-55cm

    return {
        "pass_accuracy_pct":    pass_acc,
        "dribble_success_pct":  dribble_pct,
        "shots_on_target_pct":  shots_ot,
        "duels_won_pct":        duels_pct,
        "interceptions_per90":  interc_per90,
        "goals_per90":          goals_per90,
        "assists_per90":        assists_per90,
        "sprint_30m_sec":       sprint_30m,
        "endurance_score":      endurance,
        "jump_cm":              jump_cm,
        "competition_level":    1,  # Pros = niveau 1
        # Ratings FIFA bruts
        "fifa_overall":         g("overall") or g("overall_rating"),
        "fifa_potential":       g("potential"),
        "fifa_pace":            g("pace"),
        "fifa_shooting":        g("shooting"),
        "fifa_passing":         g("passing"),
        "fifa_dribbling":       g("dribbling"),
        "fifa_defending":       g("defending"),
        "fifa_physic":          g("physic"),
    }


# ---------------------------------------------------------------------------
# Chargement et nettoyage d'un fichier CSV
# ---------------------------------------------------------------------------

def load_and_clean(
    csv_path: Path,
    min_age: int = 16,
    max_age: int = 22,
    verbose: bool = True,
) -> pd.DataFrame:
    """
    Charge un CSV FIFA, filtre par âge et normalise les colonnes.
    Gère les différences de nommage entre FC15-24, FC25 et FC26.
    """
    if not csv_path.exists():
        if verbose:
            print(f"  Fichier introuvable : {csv_path}")
        return pd.DataFrame()

    if verbose:
        print(f"  Chargement {csv_path.name}...")

    df = pd.read_csv(csv_path, low_memory=False)

    if verbose:
        print(f"  {len(df):,} lignes chargées")

    # Normaliser le nom du joueur — tous les fichiers ont long_name
    if "long_name" in df.columns:
        df["player_name"] = df["long_name"]
    elif "short_name" in df.columns:
        df["player_name"] = df["short_name"]
    else:
        df["player_name"] = "Unknown"

    # Normaliser fifa_version — tous les fichiers ont fifa_version
    # FC25 a fifa_version comme int (25), FC15-24 comme float (15.0-24.0)
    if "fifa_version" in df.columns:
        df["fifa_version"] = pd.to_numeric(df["fifa_version"], errors="coerce").fillna(25).astype(int)
    else:
        df["fifa_version"] = 25

    # Calculer l'âge si manquant (FC25 peut ne pas avoir 'age')
    if "age" not in df.columns or df["age"].isna().all():
        if "dob" in df.columns:
            df["dob_parsed"] = pd.to_datetime(df["dob"], errors="coerce")
            df["game_year"]  = df["fifa_version"].apply(
                lambda v: 1999 + int(v) if int(v) <= 24 else 2023 + (int(v) - 24)
            )
            df["age"] = df["game_year"] - df["dob_parsed"].dt.year
        else:
            df["age"] = 20

    df["age"] = pd.to_numeric(df["age"], errors="coerce").fillna(20).astype(int)

    # Filtrer par âge
    df_filtered = df[(df["age"] >= min_age) & (df["age"] <= max_age)].copy()

    if verbose:
        print(f"  {len(df_filtered):,} joueurs entre {min_age} et {max_age} ans")

    return df_filtered


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def build_sofifa_csv_database(
    data_dir:   Path | str = DATA_DIR,
    output_path: Path | str = OUTPUT_PATH,
    min_age:    int  = 16,
    max_age:    int  = 22,
    min_overall: int = 60,   # Filtrer les joueurs trop faibles (peu pertinents)
    verbose:    bool = True,
) -> pd.DataFrame:
    """
    Construit la base de référence pros depuis les CSV FIFA.

    Args:
        data_dir:    dossier contenant FC15-24.csv, FC25.csv, FC26.csv
        output_path: chemin de sortie CSV
        min_age:     âge minimum (défaut: 16)
        max_age:     âge maximum (défaut: 22)
        min_overall: overall minimum pour filtrer (défaut: 60)
        verbose:     afficher la progression

    Returns:
        DataFrame avec les profils jeunes des pros
    """
    data_dir    = Path(data_dir)
    output_path = Path(output_path)

    print("=" * 55)
    print("Construction base SoFIFA depuis CSV")
    print(f"Source : {data_dir}")
    print(f"Filtre : âge {min_age}-{max_age} ans, overall >= {min_overall}")
    print("=" * 55)

    all_dfs = []

    # Fichiers à charger
    csv_files = [
        data_dir / "FC15-24.csv",
        data_dir / "FC25.csv",
        data_dir / "FC26.csv",
    ]

    for csv_path in csv_files:
        if verbose:
            print(f"\n── {csv_path.name} ──")
        df = load_and_clean(csv_path, min_age, max_age, verbose)
        if not df.empty:
            all_dfs.append(df)

    if not all_dfs:
        print("\nAucun fichier trouvé. Vérifie que les CSV sont dans :", data_dir)
        return pd.DataFrame()

    # Concaténer
    df_all = pd.concat(all_dfs, ignore_index=True)
    print(f"\nTotal avant déduplification : {len(df_all):,} lignes")

    # Filtrer par overall minimum
    if "overall" in df_all.columns:
        df_all = df_all[df_all["overall"] >= min_overall].copy()
        print(f"Après filtre overall >= {min_overall} : {len(df_all):,} lignes")

    # Dédupliquer : garder 1 ligne par joueur × version FIFA
    # (supprimer les mises à jour intermédiaires, garder la dernière update)
    if "fifa_update" in df_all.columns:
        df_all = (
            df_all
            .sort_values("fifa_update", ascending=False)
            .drop_duplicates(subset=["player_id", "fifa_version"], keep="first")
        )
        print(f"Après déduplification (1 par joueur × version) : {len(df_all):,} lignes")

    # Construire les features Uroom
    print("\nConversion des attributs FIFA → features Uroom...")
    rows = []

    for _, row in df_all.iterrows():
        pos_str              = str(row.get("player_positions", "CM"))
        position_detail, pos_group = get_primary_position(pos_str)
        fifa_version         = int(row.get("fifa_version", 25))

        # Ignorer les gardiens pour la similarité (stats trop différentes)
        if pos_group == "GK":
            continue

        uroom_feats = fifa_to_uroom(row, fifa_version)

        rows.append({
            # Identité
            "player_id":        f"FIFA_{int(row['player_id'])}",
            "sofifa_id":        int(row["player_id"]),
            "player_name":      str(row.get("player_name", "Unknown")),
            "nationality":      str(row.get("nationality_name", "Unknown")),
            "fifa_version":     fifa_version,
            "age":              int(row["age"]),
            "dob":              str(row.get("dob", "")),
            "height_cm":        int(row.get("height_cm", 175) or 175),
            "weight_kg":        int(row.get("weight_kg", 70) or 70),
            "position_detail":  position_detail,
            "position_group":   pos_group,
            "club":             str(row.get("club_name", "Unknown")),
            "league":           str(row.get("league_name", "Unknown")),
            "preferred_foot":   str(row.get("preferred_foot", "Right")),
            "weak_foot":        int(row.get("weak_foot", 2) or 2),
            "skill_moves":      int(row.get("skill_moves", 2) or 2),
            # Features Uroom
            **uroom_feats,
        })

    df_final = pd.DataFrame(rows)

    print(f"\nBase finale : {len(df_final):,} profils")
    print(f"Joueurs uniques : {df_final['sofifa_id'].nunique():,}")
    print(f"\nDistribution par âge :")
    print(df_final["age"].value_counts().sort_index().to_string())
    print(f"\nDistribution par position :")
    print(df_final["position_group"].value_counts().to_string())
    print(f"\nTop 10 joueurs (overall le plus élevé à 16-22 ans) :")
    top = (
        df_final.sort_values("fifa_overall", ascending=False)
        .drop_duplicates("sofifa_id")
        .head(10)
    )
    print(top[["player_name", "age", "fifa_version", "fifa_overall",
               "pass_accuracy_pct", "duels_won_pct", "nationality"]].to_string(index=False))

    # Sauvegarder
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df_final.to_csv(output_path, index=False)
    print(f"\nSauvegardé : {output_path}")

    return df_final


# ---------------------------------------------------------------------------
# Chargement dans ProProfileDatabase
# ---------------------------------------------------------------------------

def load_sofifa_into_pro_db(
    csv_path: Path | str = OUTPUT_PATH,
    verbose: bool = True,
):
    """
    Charge le CSV SoFIFA dans une ProProfileDatabase.
    Chaque ligne = un joueur pro à un âge donné (16-22 ans).
    """
    from uroom.similarity import ProProfileDatabase

    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(
            f"CSV SoFIFA introuvable : {csv_path}\n"
            f"Lance d'abord build_sofifa_csv_database()"
        )

    df = pd.read_csv(csv_path)
    if verbose:
        print(f"Chargement SoFIFA : {len(df):,} profils")

    db    = ProProfileDatabase()
    added = 0

    for _, row in df.iterrows():
        features = {
            "pass_accuracy_pct":    float(row.get("pass_accuracy_pct",  65)),
            "dribble_success_pct":  float(row.get("dribble_success_pct", 50)),
            "shots_on_target_pct":  float(row.get("shots_on_target_pct", 35)),
            "duels_won_pct":        float(row.get("duels_won_pct",       45)),
            "interceptions_per90":  float(row.get("interceptions_per90",  2)),
            "goals_per90":          float(row.get("goals_per90",         0.1)),
            "assists_per90":        float(row.get("assists_per90",        0.1)),
            "competition_level":    1,
        }

        fifa_v = int(row.get("fifa_version", 25))
        year   = 1999 + fifa_v if fifa_v <= 24 else 2023 + (fifa_v - 24)
        name   = f"{row['player_name']} (FIFA {fifa_v}, {int(row['age'])} ans, {year})"

        db.add_profile(
            player_id = f"{row['player_id']}_a{int(row['age'])}",
            name      = name,
            age       = float(row["age"]),
            features  = features,
        )
        added += 1

    db.fit()
    if verbose:
        print(f"Base prête : {added:,} profils jeunes de pros (16-22 ans)")

    return db


# ---------------------------------------------------------------------------
# Combiner SoFIFA CSV + StatsBomb
# ---------------------------------------------------------------------------

def load_combined_pro_db(
    sofifa_csv:    Path | str = OUTPUT_PATH,
    statsbomb_csv: Path | str = Path("data/raw/pro_reference_database_clean.csv"),
    verbose: bool = True,
):
    """
    Combine SoFIFA (jeunes 16-22 ans) + StatsBomb (pros adultes).
    SoFIFA résout le problème des comparaisons avec des joueurs trop bons.
    StatsBomb complète avec des stats réelles de match.
    """
    from uroom.similarity import ProProfileDatabase

    db          = ProProfileDatabase()
    total_added = 0

    # 1. SoFIFA — profils jeunes reconnus
    sofifa_path = Path(sofifa_csv)
    if sofifa_path.exists():
        df_sof = pd.read_csv(sofifa_path)
        for _, row in df_sof.iterrows():
            features = {
                "pass_accuracy_pct":   float(row.get("pass_accuracy_pct",  65)),
                "dribble_success_pct": float(row.get("dribble_success_pct", 50)),
                "shots_on_target_pct": float(row.get("shots_on_target_pct", 35)),
                "duels_won_pct":       float(row.get("duels_won_pct",       45)),
                "interceptions_per90": float(row.get("interceptions_per90",  2)),
                "goals_per90":         float(row.get("goals_per90",         0.1)),
                "assists_per90":       float(row.get("assists_per90",        0.1)),
                "competition_level":   1,
            }
            fifa_v = int(row.get("fifa_version", 25))
            year   = 1999 + fifa_v if fifa_v <= 24 else 2023 + (fifa_v - 24)
            name   = f"{row['player_name']} (FIFA {fifa_v}, {int(row['age'])} ans)"

            db.add_profile(
                player_id = f"SFX_{row['player_id']}_a{int(row['age'])}",
                name      = name,
                age       = float(row["age"]),
                features  = features,
            )
            total_added += 1
        if verbose:
            print(f"SoFIFA    : {len(df_sof):,} profils jeunes (16-22 ans)")
    else:
        if verbose:
            print(f"SoFIFA CSV introuvable — ignoré")

    # 2. StatsBomb — stats réelles adultes
    sb_path = Path(statsbomb_csv)
    if sb_path.exists():
        df_sb = pd.read_csv(sb_path)
        df_sb = df_sb[
            (df_sb["pass_accuracy_pct"].between(30, 97)) &
            (df_sb["duels_won_pct"].fillna(50).between(5, 95))
        ]
        for _, row in df_sb.iterrows():
            features = {}
            for col in ["pass_accuracy_pct", "dribble_success_pct",
                        "shots_on_target_pct", "duels_won_pct",
                        "interceptions_per90", "goals_per90", "assists_per90"]:
                if col in row and not pd.isna(row[col]):
                    features[col] = float(row[col])
            if len(features) < 3:
                continue
            db.add_profile(
                player_id = f"SB_{row.get('player_id', total_added)}",
                name      = f"{row.get('player_name','Pro')} ({row.get('competition','')})",
                age       = 25.0,
                features  = features,
            )
            total_added += 1
        if verbose:
            print(f"StatsBomb : {len(df_sb):,} profils adultes")

    db.fit()
    if verbose:
        print(f"\nBase combinée : {total_added:,} profils total")

    return db


# ---------------------------------------------------------------------------
# Point d'entrée CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    df = build_sofifa_csv_database(
        data_dir    = DATA_DIR,
        output_path = OUTPUT_PATH,
        min_age     = 16,
        max_age     = 22,
        min_overall = 60,
        verbose     = True,
    )
    print(f"\nTerminé. {len(df):,} profils dans {OUTPUT_PATH}")
