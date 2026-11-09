"""
uroom/sofifa_loader.py

Construit une base de référence pros depuis l'API SoFIFA.

Stratégie :
- On récupère les joueurs connus (IDs) sur plusieurs éditions FIFA
- On filtre ceux qui avaient 16-21 ans sur chaque édition
- On mappe les ratings FIFA vers nos features Uroom
- On exporte data/raw/sofifa_young_pros.csv

Usage :
    python -m uroom.sofifa_loader

Ou depuis le notebook :
    from uroom.sofifa_loader import build_sofifa_database
    build_sofifa_database()
"""

import time
import json
import requests
import pandas as pd
import numpy as np
from pathlib import Path

API_BASE   = "https://api.sofifa.net"
API_TOKEN  = "pokh3zOGeQwr905ZRL"  # Token SoFIFA
RATE_LIMIT = 1.1   # secondes entre les requêtes (max 60/min)
OUTPUT_PATH = Path("data/raw/sofifa_young_pros.csv")

# ---------------------------------------------------------------------------
# Rosters FIFA par version (édition → roster ID de base)
# On prend le premier roster de chaque version annuelle
# ---------------------------------------------------------------------------

FIFA_VERSIONS = [
    ("15", "150001"), ("16", "160001"), ("17", "170001"),
    ("18", "180001"), ("19", "190001"), ("20", "200001"),
    ("21", "210001"), ("22", "220001"), ("23", "230001"),
    ("24", "240001"), ("25", "250001"),
]

# ---------------------------------------------------------------------------
# Joueurs cibles — pros reconnus avec leur ID SoFIFA
# On les récupère sur toutes les éditions pour avoir leurs stats jeunes
# ---------------------------------------------------------------------------

TARGET_PLAYERS = {
    # Belges et joueurs Jupiler Pro League
    192985: "Kevin De Bruyne",
    183898: "Eden Hazard",
    197445: "Romelu Lukaku",
    212726: "Thibaut Courtois",
    209331: "Youri Tielemans",
    230621: "Jeremy Doku",
    246669: "Lois Openda",
    243294: "Charles De Ketelaere",
    # Top jeunes mondiaux
    277643: "Lamine Yamal",
    246669: "Pedri",
    231866: "Gavi",
    237692: "Jude Bellingham",
    246669: "Eduardo Camavinga",
    # Références internationales
    20801:  "Lionel Messi",
    158023: "Cristiano Ronaldo",
    188545: "Neymar Jr",
    231747: "Kylian Mbappe",
    210257: "Erling Haaland",
    # Milieux de terrain
    215914: "Florian Wirtz",
    244923: "Jamal Musiala",
    246185: "Ryan Gravenberch",
    # Défenseurs
    203376: "Antonio Rudiger",
    220834: "Dayot Upamecano",
    # Gardiens
    212831: "Gianluigi Donnarumma",
}

# ---------------------------------------------------------------------------
# Mapping FIFA ratings → features Uroom
# Les ratings FIFA sont sur 1-99, nos features sur différentes échelles
# ---------------------------------------------------------------------------

def sofifa_to_uroom(player_data: dict, age: float) -> dict:
    """
    Convertit les ratings SoFIFA en features Uroom normalisées.

    Méthode de normalisation :
    - Les ratings FIFA (1-99) sont mappés vers nos échelles
    - On utilise des formules calibrées sur les distributions réelles
    - pass_accuracy_pct : shortPassing/99 * 45 + 45 (range 45-90%)
    - Les features physiques utilisent pace/stamina/strength
    """
    d = player_data

    # Pass accuracy : shortPassing + longPassing / 2, normalisé
    short_pass  = d.get("shortPassing", 50) or 50
    long_pass   = d.get("longPassing", 50) or 50
    pass_rating = (short_pass * 0.7 + long_pass * 0.3)
    pass_acc    = round(pass_rating / 99 * 45 + 45, 1)  # → 45-90%

    # Dribble : dribbling + ballControl / 2
    drib_rating = (d.get("dribbling", 50) or 50) * 0.6 + (d.get("ballControl", 50) or 50) * 0.4
    dribble_pct = round(drib_rating / 99 * 50 + 25, 1)  # → 25-75%

    # Tirs cadrés : finishing + shotPower / 2
    shot_rating = (d.get("finishing", 50) or 50) * 0.6 + (d.get("shotPower", 50) or 50) * 0.4
    shots_ot    = round(shot_rating / 99 * 40 + 15, 1)  # → 15-55%

    # Duels gagnés : defending + aggression + heading / 3
    duel_rating = (
        (d.get("standingTackle", 50) or 50) * 0.4 +
        (d.get("aggression", 50) or 50) * 0.3 +
        (d.get("heading", 50) or 50) * 0.3
    )
    duels_pct = round(duel_rating / 99 * 40 + 25, 1)  # → 25-65%

    # Interceptions / 90
    interc_rating = d.get("interceptions", 30) or 30
    interc_per90  = round(interc_rating / 99 * 4 + 0.5, 2)  # → 0.5-4.5

    # Goals / 90 : positioning + finishing
    pos_rating  = (d.get("positioning", 40) or 40) * 0.5 + (d.get("finishing", 40) or 40) * 0.5
    goals_per90 = round(pos_rating / 99 * 0.6, 3)  # → 0-0.6

    # Assists / 90 : vision + crossing
    vis_rating   = (d.get("vision", 50) or 50) * 0.6 + (d.get("crossing", 50) or 50) * 0.4
    assists_per90 = round(vis_rating / 99 * 0.5, 3)  # → 0-0.5

    # Vitesse : sprint_30m estimé depuis pace
    pace = d.get("pac", 70) or d.get("sprintSpeed", 70) or 70
    # pace 99 → sprint 3.8s | pace 50 → sprint 4.8s
    sprint_30m = round(4.8 - (pace / 99) * 1.0, 3)

    # Physique : endurance depuis stamina, jump depuis jumping
    stamina       = d.get("stamina", 60) or 60
    endurance     = round(stamina / 99 * 30 + 38, 1)  # → 38-68
    jumping_stat  = d.get("jumping", 60) or 60
    jump_cm       = round(jumping_stat / 99 * 25 + 25, 1)  # → 25-50cm

    # Competition level : pros = niveau 1
    comp_level = 1

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
        "competition_level":    comp_level,
        "age":                  round(age, 1),
        # Ratings FIFA bruts pour référence
        "fifa_overall":         d.get("overallRating", 0),
        "fifa_potential":       d.get("potential", 0),
        "fifa_pac":             d.get("pac", 0),
        "fifa_sho":             d.get("sho", 0),
        "fifa_pas":             d.get("pas", 0),
        "fifa_dri":             d.get("dri", 0),
        "fifa_def":             d.get("def", 0),
        "fifa_phy":             d.get("phy", 0),
    }


# ---------------------------------------------------------------------------
# Récupération API
# ---------------------------------------------------------------------------

def get_player_for_roster(player_id: int, roster: str, session: requests.Session) -> dict | None:
    """Récupère les données d'un joueur pour un roster FIFA spécifique."""
    url = f"{API_BASE}/player/{player_id}/{roster}"
    try:
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            return r.json().get("data")
        elif r.status_code == 404:
            return None  # Joueur pas dans cette version
        elif r.status_code == 429:
            print("Rate limit atteint — pause 60s...")
            time.sleep(60)
            return get_player_for_roster(player_id, roster, session)
    except Exception as e:
        print(f"Erreur {player_id}/{roster}: {e}")
    return None


def get_player_data_with_birth(
    player_id: int,
    roster: str,
    session: requests.Session
) -> dict | None:
    """
    Récupère les données d'un joueur pour un roster donné.
    Retourne None si le joueur n'existe pas dans ce roster.
    """
    url = f"{API_BASE}/player/{player_id}/{roster}"
    try:
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            return r.json().get("data")
        elif r.status_code == 404:
            return None
        elif r.status_code == 429:
            print("Rate limit — pause 65s...")
            time.sleep(65)
            return get_player_data_with_birth(player_id, roster, session)
    except Exception as e:
        print(f"  Erreur {player_id}/{roster}: {e}")
    return None


def extract_birth_year(data: dict) -> int | None:
    """
    Extrait l'année de naissance depuis les données SoFIFA.
    Essaie birthYear, puis calcule depuis birthDate (jours depuis 01/01/1970).
    """
    # Méthode 1 : birthYear direct
    by = data.get("birthYear")
    if by and int(by) > 1970:
        return int(by)

    # Méthode 2 : birthDate en jours depuis epoch
    bd = data.get("birthDate")
    if bd:
        try:
            from datetime import date, timedelta
            birth = date(1970, 1, 1) + timedelta(days=int(bd))
            return birth.year
        except:
            pass

    # Méthode 3 : age + version
    age = data.get("age")
    if age:
        import datetime
        return datetime.date.today().year - int(age)

    return None


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def build_sofifa_database(
    output_path: str | Path = OUTPUT_PATH,
    target_players: dict   = None,
    min_age: int           = 16,
    max_age: int           = 22,
    verbose: bool          = True,
) -> pd.DataFrame:
    """
    Construit la base de référence pros depuis l'API SoFIFA.
    Version corrigée : récupère birthYear directement depuis les rosters.
    """
    if target_players is None:
        target_players = TARGET_PLAYERS

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Uroom Analytics - Non-commercial research"
    })

    rows       = []
    n_players  = len(target_players)
    n_versions = len(FIFA_VERSIONS)

    print(f"Construction base SoFIFA : {n_players} joueurs x {n_versions} versions")
    print(f"Filtre age : {min_age}-{max_age} ans")
    print(f"Duree estimee : ~{n_players * n_versions * RATE_LIMIT / 60:.0f} minutes\n")

    pos_map = {
        0: "GK",
        **{i: "DEF" for i in range(1, 9)},
        **{i: "MID" for i in range(9, 20)},
        **{i: "FWD" for i in range(20, 28)},
    }

    for player_idx, (player_id, player_name) in enumerate(target_players.items()):
        if verbose:
            print(f"[{player_idx+1}/{n_players}] {player_name} (ID: {player_id})")

        birth_year    = None
        found_snapshots = 0

        for fifa_version, roster in FIFA_VERSIONS:
            # Récupérer les données pour ce roster
            data = get_player_data_with_birth(player_id, roster, session)
            time.sleep(RATE_LIMIT)

            if data is None:
                continue

            # Extraire l'année de naissance si pas encore trouvée
            if birth_year is None:
                birth_year = extract_birth_year(data)

            if birth_year is None:
                continue

            # Calculer l'âge dans cette version
            # FIFA XX sort en septembre, représente la saison XX-XX+1
            # FIFA 15 → 2014, FIFA 22 → 2021, FC 24 → 2023, FC 25 → 2024
            version_int = int(fifa_version)
            if version_int <= 23:
                version_year = 2000 + version_int - 1  # FIFA 15 → 2014
            else:
                version_year = 2000 + version_int - 1  # FC 24 → 2023, FC 25 → 2024

            player_age = version_year - birth_year

            # Filtrer par âge
            if not (min_age <= player_age <= max_age):
                continue

            # Convertir vers features Uroom
            uroom_features = sofifa_to_uroom(data, float(player_age))

            pos_code = data.get("position1", 14)
            position = pos_map.get(pos_code, "MID")

            rows.append({
                "player_id":    f"SOFIFA_{player_id}",
                "player_name":  player_name,
                "birth_year":   birth_year,
                "fifa_version": f"FIFA {fifa_version}",
                "age":          float(player_age),
                "position":     position,
                "height_cm":    data.get("height", 175),
                "weight_kg":    data.get("weight", 70),
                "nationality":  data.get("country", "Unknown"),
                **uroom_features,
            })
            found_snapshots += 1

        if verbose:
            by_str = str(birth_year) if birth_year else "inconnu"
            print(f"  -> naissance: {by_str} | {found_snapshots} snapshots ({min_age}-{max_age} ans)")

    if not rows:
        print("Aucune donnee recuperee.")
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)

    print(f"\n{'='*50}")
    print(f"Base SoFIFA construite !")
    print(f"  Snapshots total  : {len(df)}")
    print(f"  Joueurs uniques  : {df['player_id'].nunique()}")
    print(f"  Sauvegarde       : {output_path}")
    print(f"\nDistribution par age :")
    print(df['age'].value_counts().sort_index())
    print(f"\nTop joueurs :")
    print(df[['player_name', 'age', 'fifa_version', 'fifa_overall',
              'pass_accuracy_pct', 'duels_won_pct']].head(15).to_string(index=False))

    return df


# ---------------------------------------------------------------------------
# Chargement dans ProProfileDatabase
# ---------------------------------------------------------------------------

def load_sofifa_into_pro_db(
    csv_path: str | Path = OUTPUT_PATH,
    verbose: bool = True,
):
    """
    Charge le CSV SoFIFA dans une ProProfileDatabase.
    Chaque ligne = un joueur pro à un âge donné.

    Returns:
        ProProfileDatabase prête à l'emploi pour la similarité
    """
    from uroom.similarity import ProProfileDatabase, SIMILARITY_FEATURES

    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(
            f"CSV SoFIFA introuvable : {csv_path}\n"
            f"Lance d'abord build_sofifa_database()"
        )

    df = pd.read_csv(csv_path)
    if verbose:
        print(f"Chargement SoFIFA : {len(df)} snapshots, {df['player_id'].nunique()} joueurs")

    db  = ProProfileDatabase()
    col_mapping = {
        "pass_accuracy_pct":   "pass_accuracy_pct",
        "dribble_success_pct": "dribble_success_pct",
        "shots_on_target_pct": "shots_on_target_pct",
        "duels_won_pct":       "duels_won_pct",
        "interceptions_per90": "interceptions_per90",
        "goals_per90":         "goals_per90",
        "assists_per90":       "assists_per90",
        "competition_level":   "competition_level",
    }

    added = 0
    for _, row in df.iterrows():
        features = {}
        for csv_col, feat_name in col_mapping.items():
            if csv_col in row and not pd.isna(row[csv_col]):
                features[feat_name] = float(row[csv_col])

        if len(features) < 3:
            continue

        fifa_v = row.get("fifa_version", "")
        name   = f"{row['player_name']} ({fifa_v}, {int(row['age'])} ans)"

        db.add_profile(
            player_id = str(row["player_id"]) + f"_age{int(row['age'])}",
            name      = name,
            age       = float(row["age"]),
            features  = features,
        )
        added += 1

    db.fit()
    if verbose:
        print(f"Base SoFIFA prête : {added} profils jeunes de pros reconnus")

    return db


# ---------------------------------------------------------------------------
# Combiner SoFIFA + StatsBomb
# ---------------------------------------------------------------------------

def load_combined_pro_db(
    sofifa_csv:    str | Path = OUTPUT_PATH,
    statsbomb_csv: str | Path = Path("data/raw/pro_reference_database_clean.csv"),
    verbose: bool = True,
):
    """
    Combine les deux sources :
    - SoFIFA : profils jeunes (16-22 ans) de pros reconnus
    - StatsBomb : stats réelles de pros adultes en match

    La combinaison donne une base plus riche et plus comparable
    aux jeunes joueurs de l'académie.
    """
    from uroom.similarity import ProProfileDatabase, SIMILARITY_FEATURES

    db = ProProfileDatabase()
    total_added = 0

    # 1. SoFIFA — profils jeunes
    sofifa_path = Path(sofifa_csv)
    if sofifa_path.exists():
        df_sof = pd.read_csv(sofifa_path)
        for _, row in df_sof.iterrows():
            features = {
                "pass_accuracy_pct":   float(row.get("pass_accuracy_pct",  65)),
                "dribble_success_pct": float(row.get("dribble_success_pct", 50)),
                "duels_won_pct":       float(row.get("duels_won_pct",       45)),
                "interceptions_per90": float(row.get("interceptions_per90",  2)),
                "goals_per90":         float(row.get("goals_per90",         0.1)),
                "assists_per90":       float(row.get("assists_per90",        0.1)),
                "competition_level":   1,
            }
            fifa_v = row.get("fifa_version", "")
            db.add_profile(
                player_id = f"SFX_{row['player_id']}_a{int(row['age'])}",
                name      = f"{row['player_name']} ({fifa_v}, {int(row['age'])} ans)",
                age       = float(row["age"]),
                features  = features,
            )
            total_added += 1
        if verbose:
            print(f"SoFIFA : {len(df_sof)} profils jeunes ajoutés")
    else:
        if verbose:
            print(f"SoFIFA CSV introuvable ({sofifa_path}) — ignoré")

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
            for col in ["pass_accuracy_pct","dribble_success_pct","shots_on_target_pct",
                        "duels_won_pct","interceptions_per90","goals_per90","assists_per90"]:
                if col in row and not pd.isna(row[col]):
                    features[col] = float(row[col])
            if len(features) < 3:
                continue
            name = f"{row.get('player_name','Pro')} ({row.get('competition','')})"
            db.add_profile(
                player_id = f"SB_{row.get('player_id', total_added)}",
                name      = name,
                age       = 25.0,
                features  = features,
            )
            total_added += 1
        if verbose:
            print(f"StatsBomb : {len(df_sb)} profils adultes ajoutés")

    db.fit()
    if verbose:
        print(f"\nBase combinée : {total_added} profils total")

    return db


# ---------------------------------------------------------------------------
# Point d'entrée CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Construction base SoFIFA ===\n")
    df = build_sofifa_database(
        output_path    = OUTPUT_PATH,
        min_age        = 16,
        max_age        = 22,
        verbose        = True,
    )
    print(f"\nTerminé. {len(df)} snapshots sauvegardés dans {OUTPUT_PATH}")
