"""
uroom/pro_database_builder.py
Construction de la base de référence pros depuis StatsBomb Open Data.

Source : StatsBomb Open Data (gratuit, GitHub)
         https://github.com/statsbomb/open-data

Pipeline :
1. Récupérer tous les matchs disponibles dans les compétitions sélectionnées
2. Pour chaque match, agréger les stats par joueur (passes, duels, interceptions...)
3. Agréger par joueur + saison pour avoir un profil annuel
4. Exporter en CSV → data/raw/pro_reference_database.csv
5. Charger dans ProProfileDatabase pour la similarité Mahalanobis

Usage :
    from uroom.pro_database_builder import build_pro_reference_csv, load_pro_reference_database
    build_pro_reference_csv()  # à faire une seule fois
    pro_db = load_pro_reference_database(df_train)
"""

import os
import warnings
import pandas as pd
import numpy as np
from pathlib import Path

warnings.filterwarnings("ignore")  # Supprime le NoAuthWarning StatsBomb

# ---------------------------------------------------------------------------
# Compétitions à utiliser
# Sélection des compétitions masculines avec le plus de matchs disponibles
# ---------------------------------------------------------------------------

TARGET_COMPETITIONS = [
    # Grandes ligues saison complète 2015/16 — le plus gros volume
    (12,  27,  "Serie A 2015-16"),
    (2,   27,  "Premier League 2015-16"),
    (11,  27,  "La Liga 2015-16"),
    (7,   27,  "Ligue 1 2015-16"),
    (9,   27,  "Bundesliga 2015-16"),
    # La Liga — toutes les saisons disponibles
    (11,  26,  "La Liga 2014-15"),
    (11,  23,  "La Liga 2011-12"),
    (11,  1,   "La Liga 2017-18"),
    (11,  90,  "La Liga 2020-21"),
    (11,  21,  "La Liga 2009-10"),
    (11,  2,   "La Liga 2016-17"),
    (11,  4,   "La Liga 2018-19"),
    (11,  42,  "La Liga 2019-20"),
    (11,  22,  "La Liga 2010-11"),
    (11,  24,  "La Liga 2012-13"),
    (11,  25,  "La Liga 2013-14"),
    (11,  41,  "La Liga 2008-09"),
    (11,  40,  "La Liga 2007-08"),
    (11,  39,  "La Liga 2006-07"),
    (11,  38,  "La Liga 2005-06"),
    (11,  37,  "La Liga 2004-05"),
    # Bundesliga
    (9,   281, "Bundesliga 2023-24"),
    # Ligue 1
    (7,   235, "Ligue 1 2022-23"),
    (7,   108, "Ligue 1 2021-22"),
    # Premier League
    (2,   44,  "Premier League 2003-04"),
    # FIFA World Cup
    (43,  3,   "World Cup 2018"),
    (43,  106, "World Cup 2022"),
    (43,  51,  "World Cup 1974"),
    (43,  272, "World Cup 1970"),
    (43,  54,  "World Cup 1986"),
    # UEFA Euro
    (55,  43,  "UEFA Euro 2020"),
    (55,  282, "UEFA Euro 2024"),
    # Copa America
    (223, 282, "Copa America 2024"),
    # AFCON
    (1267, 107, "AFCON 2023"),
    # Champions League — 1 match par saison mais beaucoup de saisons
    (16,  4,   "UCL 2018-19"),
    (16,  1,   "UCL 2017-18"),
    (16,  2,   "UCL 2016-17"),
    (16,  27,  "UCL 2015-16"),
    (16,  26,  "UCL 2014-15"),
    (16,  25,  "UCL 2013-14"),
    (16,  24,  "UCL 2012-13"),
    (16,  23,  "UCL 2011-12"),
    (16,  22,  "UCL 2010-11"),
    (16,  21,  "UCL 2009-10"),
    (16,  41,  "UCL 2008-09"),
    (16,  39,  "UCL 2006-07"),
    (16,  37,  "UCL 2004-05"),
    (16,  44,  "UCL 2003-04"),
    (16,  76,  "UCL 1999-00"),
    (16,  277, "UCL 1972-73"),
    (16,  71,  "UCL 1971-72"),
    (16,  276, "UCL 1970-71"),
    # Autres
    (44,  107, "MLS 2023"),
    (1238, 108, "Indian Super League 2021-22"),
]

# ---------------------------------------------------------------------------
# Étape 1 : Récupération des matchs
# ---------------------------------------------------------------------------

def get_available_matches(competition_id: int, season_id: int) -> pd.DataFrame:
    """Retourne la liste des matchs pour une compétition/saison donnée."""
    try:
        from statsbombpy import sb
        matches = sb.matches(competition_id=competition_id, season_id=season_id)
        return matches
    except Exception as e:
        print(f"  Erreur matchs ({competition_id}/{season_id}) : {e}")
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Étape 2 : Calcul des stats par joueur depuis les events d'un match
# ---------------------------------------------------------------------------

def compute_player_stats_from_match(match_id: int) -> pd.DataFrame:
    """
    Calcule les stats agrégées par joueur pour un match donné.

    Métriques calculées depuis les events StatsBomb :
    - pass_accuracy_pct  : % passes complètes
    - duels_won_pct      : % duels gagnés (tackles + aériens)
    - interceptions      : nombre d'interceptions
    - goals              : buts marqués
    - assists            : passes décisives
    - minutes_played     : estimé depuis les events
    - shots_on_target    : tirs cadrés
    - dribbles_won_pct   : % dribbles réussis

    Returns:
        DataFrame avec une ligne par joueur du match
    """
    try:
        from statsbombpy import sb
        events = sb.events(match_id=match_id)
    except Exception as e:
        return pd.DataFrame()

    if events.empty:
        return pd.DataFrame()

    players_stats = {}

    def get_player(row):
        pid  = row.get("player_id")
        name = row.get("player")
        team = row.get("team")
        pos  = row.get("position")
        if pd.isna(pid):
            return None
        if pid not in players_stats:
            players_stats[pid] = {
                "player_id":   pid,
                "player_name": name,
                "team":        team,
                "position":    pos,
                "passes_total":      0,
                "passes_complete":   0,
                "duels_total":       0,
                "duels_won":         0,
                "interceptions":     0,
                "goals":             0,
                "assists":           0,
                "shots_total":       0,
                "shots_on_target":   0,
                "dribbles_total":    0,
                "dribbles_won":      0,
                "pressures":         0,
            }
        return pid

    # Traitement de chaque event
    for _, row in events.iterrows():
        event_type = row.get("type", "")
        pid = get_player(row)
        if pid is None:
            continue

        s = players_stats[pid]

        # --- Passes ---
        if event_type == "Pass":
            s["passes_total"] += 1
            outcome = row.get("pass_outcome")
            # Une passe est complète si outcome est NaN (pas d'outcome = succès dans StatsBomb)
            if pd.isna(outcome):
                s["passes_complete"] += 1

        # --- Duels ---
        elif event_type == "Duel":
            s["duels_total"] += 1
            outcome = row.get("duel_outcome")
            if isinstance(outcome, str) and any(
                w in outcome for w in ["Won", "Success"]
            ):
                s["duels_won"] += 1

        # --- Interceptions ---
        elif event_type == "Interception":
            outcome = row.get("interception_outcome")
            if isinstance(outcome, str) and any(
                w in outcome for w in ["Won", "Success"]
            ):
                s["interceptions"] += 1

        # --- Tirs ---
        elif event_type == "Shot":
            s["shots_total"] += 1
            outcome = row.get("shot_outcome")
            if isinstance(outcome, str) and outcome == "Goal":
                s["goals"] += 1
            if isinstance(outcome, str) and outcome in ["Goal", "Saved"]:
                s["shots_on_target"] += 1

        # --- Passes décisives ---
        # Dans StatsBomb, une passe avec goal_assist=True
        elif event_type == "Pass":
            if row.get("pass_goal_assist") is True:
                s["assists"] += 1

        # --- Dribbles ---
        elif event_type == "Dribble":
            s["dribbles_total"] += 1
            outcome = row.get("dribble_outcome")
            if isinstance(outcome, str) and outcome == "Complete":
                s["dribbles_won"] += 1

        # --- Pressing ---
        elif event_type == "Pressure":
            s["pressures"] += 1

    if not players_stats:
        return pd.DataFrame()

    df = pd.DataFrame(list(players_stats.values()))

    # Calcul des métriques finales
    df["pass_accuracy_pct"]   = np.where(
        df["passes_total"] > 0,
        (df["passes_complete"] / df["passes_total"] * 100).round(1),
        np.nan
    )
    df["duels_won_pct"]       = np.where(
        df["duels_total"] > 0,
        (df["duels_won"] / df["duels_total"] * 100).round(1),
        np.nan
    )
    df["shots_on_target_pct"] = np.where(
        df["shots_total"] > 0,
        (df["shots_on_target"] / df["shots_total"] * 100).round(1),
        np.nan
    )
    df["dribble_success_pct"] = np.where(
        df["dribbles_total"] > 0,
        (df["dribbles_won"] / df["dribbles_total"] * 100).round(1),
        np.nan
    )

    return df[[
        "player_id", "player_name", "team", "position",
        "pass_accuracy_pct", "duels_won_pct",
        "shots_on_target_pct", "dribble_success_pct",
        "interceptions", "goals", "assists",
        "passes_total", "duels_total", "shots_total",
        "pressures",
    ]]


# ---------------------------------------------------------------------------
# Étape 3 : Agrégation par joueur + compétition
# ---------------------------------------------------------------------------

def aggregate_player_season(
    match_stats: list[pd.DataFrame],
    competition_name: str,
) -> pd.DataFrame:
    """
    Agrège les stats de plusieurs matchs en un profil joueur par saison.
    Les métriques de pourcentage sont pondérées par le nombre de matchs.
    """
    if not match_stats:
        return pd.DataFrame()

    df_all = pd.concat(match_stats, ignore_index=True)
    if df_all.empty:
        return pd.DataFrame()

    # Agréger
    agg = df_all.groupby(["player_id", "player_name", "team", "position"]).agg(
        matches_played       = ("passes_total",      "count"),
        pass_accuracy_pct    = ("pass_accuracy_pct", "mean"),
        duels_won_pct        = ("duels_won_pct",     "mean"),
        shots_on_target_pct  = ("shots_on_target_pct", "mean"),
        dribble_success_pct  = ("dribble_success_pct", "mean"),
        interceptions_total  = ("interceptions",     "sum"),
        goals_total          = ("goals",             "sum"),
        assists_total        = ("assists",            "sum"),
        passes_total         = ("passes_total",      "sum"),
        duels_total          = ("duels_total",       "sum"),
        shots_total          = ("shots_total",       "sum"),
        pressures_total      = ("pressures",         "sum"),
    ).reset_index()

    # Métriques per 90 (estimation : ~90 min par match)
    agg["interceptions_per90"] = (
        agg["interceptions_total"] / agg["matches_played"]
    ).round(2)
    agg["goals_per90"]  = (agg["goals_total"]   / agg["matches_played"]).round(3)
    agg["assists_per90"] = (agg["assists_total"] / agg["matches_played"]).round(3)

    agg["competition"] = competition_name

    # Filtrer les joueurs avec moins de 3 matchs (stats peu fiables)
    agg = agg[agg["matches_played"] >= 3].copy()

    return agg


# ---------------------------------------------------------------------------
# Étape 4 : Pipeline complet → CSV
# ---------------------------------------------------------------------------

def build_pro_reference_csv(
    output_path: str = "data/raw/pro_reference_database.csv",
    competitions: list = None,
    verbose: bool = True,
) -> pd.DataFrame:
    """
    Construit le CSV de référence pros depuis StatsBomb Open Data.

    Lance une seule fois — le résultat est mis en cache dans le CSV.
    Durée estimée : 5-15 minutes selon la connexion (beaucoup de requêtes HTTP).

    Args:
        output_path:   chemin de sortie du CSV
        competitions:  liste de (competition_id, season_id, nom)
                       par défaut : TARGET_COMPETITIONS
        verbose:       afficher la progression

    Returns:
        DataFrame de référence pros
    """
    from statsbombpy import sb

    if competitions is None:
        competitions = TARGET_COMPETITIONS

    all_season_stats = []
    total_matches    = 0
    total_players    = 0

    for comp_id, season_id, comp_name in competitions:
        if verbose:
            print(f"\n{'─'*50}")
            print(f"Compétition : {comp_name} ({comp_id}/{season_id})")

        # Récupérer les matchs
        matches = get_available_matches(comp_id, season_id)
        if matches.empty:
            if verbose:
                print(f"  → Aucun match disponible, on passe")
            continue

        n_matches = len(matches)
        if verbose:
            print(f"  → {n_matches} matchs trouvés")

        # Calculer les stats match par match
        match_stats_list = []
        for i, (_, match_row) in enumerate(matches.iterrows()):
            match_id = match_row["match_id"]
            if verbose and i % 10 == 0:
                print(f"  Match {i+1}/{n_matches}...", end="\r")

            stats = compute_player_stats_from_match(match_id)
            if not stats.empty:
                match_stats_list.append(stats)

        if not match_stats_list:
            continue

        # Agréger par joueur
        season_df = aggregate_player_season(match_stats_list, comp_name)
        if not season_df.empty:
            all_season_stats.append(season_df)
            total_matches += n_matches
            total_players += len(season_df)
            if verbose:
                print(f"  → {len(season_df)} profils joueurs générés    ")

    if not all_season_stats:
        print("Aucune donnée récupérée.")
        return pd.DataFrame()

    # Concaténer toutes les compétitions
    df_final = pd.concat(all_season_stats, ignore_index=True)

    # Dédupliquer : si un joueur apparaît dans plusieurs compétitions,
    # garder sa meilleure saison (le plus de matchs joués)
    df_best = (
        df_final
        .sort_values("matches_played", ascending=False)
        .drop_duplicates(subset=["player_id"], keep="first")
        .reset_index(drop=True)
    )

    # Sauvegarder
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    df_final.to_csv(output_path.replace(".csv", "_full.csv"), index=False)
    df_best.to_csv(output_path, index=False)

    if verbose:
        print(f"\n{'='*50}")
        print(f"Base de référence construite !")
        print(f"  Matchs traités  : {total_matches}")
        print(f"  Profils uniques : {len(df_best)}")
        print(f"  Sauvegardé      : {output_path}")
        print(f"  Complet         : {output_path.replace('.csv', '_full.csv')}")

    return df_best


# ---------------------------------------------------------------------------
# Étape 5 : Chargement dans ProProfileDatabase
# ---------------------------------------------------------------------------

def load_pro_reference_database(
    df_train: pd.DataFrame = None,
    csv_path: str = "data/raw/pro_reference_database.csv",
    also_add_synthetic: bool = True,
    verbose: bool = True,
):
    """
    Charge le CSV de référence pros dans une ProProfileDatabase.

    Args:
        df_train:           DataFrame d'entraînement (pour ajouter des pros synthétiques)
        csv_path:           chemin du CSV généré par build_pro_reference_csv()
        also_add_synthetic: ajouter les pros synthétiques pour densifier la base
        verbose:            afficher les infos de chargement

    Returns:
        ProProfileDatabase ajustée et prête à l'emploi
    """
    from uroom.similarity import ProProfileDatabase, SIMILARITY_FEATURES

    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"CSV introuvable : {csv_path}\n"
            f"Lance d'abord build_pro_reference_csv() pour construire la base."
        )

    df_ref = pd.read_csv(csv_path)
    # Filtrer les outliers — joueurs avec stats aberrantes qui biaiseraient la similarité
    df_ref = df_ref[
        (df_ref['pass_accuracy_pct'].between(30, 97)) &
        (df_ref['duels_won_pct'].fillna(50).between(5, 95))
    ].copy()
    print(f"Après filtre outliers : {len(df_ref)} profils")

    if verbose:
        print(f"Chargement de {len(df_ref)} profils pros depuis {csv_path}")

    db = ProProfileDatabase()

    # Mapping colonnes CSV → SIMILARITY_FEATURES
    col_mapping = {
        "pass_accuracy_pct":   "pass_accuracy_pct",
        "duels_won_pct":       "duels_won_pct",
        "shots_on_target_pct": "shots_on_target_pct",
        "dribble_success_pct": "dribble_success_pct",
        "interceptions_per90": "interceptions_per90",
        "goals_per90":         "goals_per90",
        "assists_per90":       "assists_per90",
        "competition_level":   "competition_level",
    }

    added = 0
    for _, row in df_ref.iterrows():
        features = {}
        for csv_col, feat_name in col_mapping.items():
            if csv_col in row and not pd.isna(row[csv_col]):
                features[feat_name] = float(row[csv_col])

        if len(features) < 3:  # Pas assez de features → on passe
            continue

        name = f"{row.get('player_name', 'Joueur pro')} ({row.get('competition', '')})"

        db.add_profile(
            player_id = str(row.get("player_id", f"PRO_{added}")),
            name      = name,
            age       = 24.0,  # Estimation : pros en activité ~24 ans en moyenne
            features  = features,
        )
        added += 1

    # Ajouter les pros synthétiques si demandé
    if also_add_synthetic and df_train is not None:
        df_pros = df_train[df_train["is_pro"] == 1]
        for _, row in df_pros.iterrows():
            features = {f: row[f] for f in SIMILARITY_FEATURES if f in row.index and not pd.isna(row.get(f))}
            db.add_profile(
                player_id = f"SYN_{row['player_id']}",
                name      = f"Profil académie #{row['player_id']}",
                age       = float(row["age"]),
                features  = features,
            )

    db.fit()

    if verbose:
        print(f"Base construite : {added} profils réels + "
              f"{len(df_train[df_train['is_pro']==1]) if df_train is not None and also_add_synthetic else 0} synthétiques")

    return db


# ---------------------------------------------------------------------------
# Vérification rapide sans tout télécharger
# ---------------------------------------------------------------------------

def quick_check(n_competitions: int = 2, n_matches_per_comp: int = 3):
    """
    Test rapide sur quelques matchs pour vérifier que tout fonctionne
    avant de lancer le build complet.

    Args:
        n_competitions:      nombre de compétitions à tester
        n_matches_per_comp:  nombre de matchs par compétition
    """
    from statsbombpy import sb

    print("=== QUICK CHECK ===\n")
    test_comps = TARGET_COMPETITIONS[:n_competitions]

    for comp_id, season_id, comp_name in test_comps:
        print(f"Test : {comp_name}")
        matches = get_available_matches(comp_id, season_id)
        if matches.empty:
            print(f"  → Aucun match\n")
            continue

        sample = matches.head(n_matches_per_comp)
        match_stats_list = []

        for _, row in sample.iterrows():
            mid   = row["match_id"]
            home  = row.get("home_team", "?")
            away  = row.get("away_team", "?")
            print(f"  Match {mid} : {home} vs {away}")
            stats = compute_player_stats_from_match(mid)
            if not stats.empty:
                match_stats_list.append(stats)
                print(f"    → {len(stats)} joueurs, passes moy={stats['pass_accuracy_pct'].mean():.1f}%")

        season_df = aggregate_player_season(match_stats_list, comp_name)
        print(f"\n  Profils générés : {len(season_df)}")
        if not season_df.empty:
            print(season_df[["player_name", "pass_accuracy_pct", "duels_won_pct",
                             "interceptions_per90", "matches_played"]].head(5).to_string(index=False))
        print()

    print("=== FIN QUICK CHECK ===")