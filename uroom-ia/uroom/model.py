"""
uroom/model.py
Pipeline d'entraînement, évaluation et interprétation du modèle de potentiel.

Version 3 — philosophie objectif-first :
- Entraînement par défaut sur features objectives uniquement (sans scout)
- Le score scout est un signal d'alerte séparé, pas une feature ML
- predict_potential retourne scout_alert et score_reliability
- Le score composite = 65% ML + 35% similarité (scout retiré du calcul)
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import warnings

from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split, RepeatedStratifiedKFold
from sklearn.metrics import (
    roc_auc_score, classification_report,
    RocCurveDisplay, precision_recall_curve, average_precision_score,
)

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    warnings.warn("SHAP non installé.")

from uroom.features import get_feature_columns, select_features_for_dataset


# ---------------------------------------------------------------------------
# Split par joueur stratifié
# ---------------------------------------------------------------------------

def temporal_train_test_split(
    df: pd.DataFrame,
    test_seasons: list[str] = None,
    test_ratio: float = 0.20,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split par joueur stratifié sur is_pro.
    Tous les snapshots d'un même joueur vont dans le même split.
    """
    player_labels = (
        df.groupby("player_id")["is_pro"]
        .last()
        .reset_index()
    )

    train_ids, test_ids = train_test_split(
        player_labels["player_id"],
        test_size    = test_ratio,
        stratify     = player_labels["is_pro"],
        random_state = 42,
    )

    df_train = df[df["player_id"].isin(train_ids)].copy()
    df_test  = df[df["player_id"].isin(test_ids)].copy()

    n_pro_train = int(df_train["is_pro"].sum())
    n_pro_test  = int(df_test["is_pro"].sum())

    print(f"Train : {len(df_train)} snapshots ({n_pro_train} pros) "
          f"— {len(train_ids)} joueurs")
    print(f"Test  : {len(df_test)} snapshots ({n_pro_test} pros) "
          f"— {len(test_ids)} joueurs")

    return df_train, df_test


# ---------------------------------------------------------------------------
# Construction du pipeline sklearn
# ---------------------------------------------------------------------------

def build_pipeline(n_estimators: int = 1200, random_state: int = 42) -> Pipeline:
    """
    Pipeline avec hyperparamètres pour classes déséquilibrées.
    L'imputation médiane gère les NaN sur les deltas (premier snapshot = NaN normal).
    """
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler()),
        ("clf",     RandomForestClassifier(
            n_estimators     = n_estimators,
            max_depth        = 7,
            min_samples_leaf = 6,
            max_features     = "sqrt",
            class_weight     = "balanced_subsample",
            oob_score        = True,
            random_state     = random_state,
            n_jobs           = -1,
        )),
    ])


# ---------------------------------------------------------------------------
# Entraînement
# ---------------------------------------------------------------------------

def train_model(
    df_train: pd.DataFrame,
    feature_cols: list[str],
) -> tuple[Pipeline, list[str]]:
    """
    Entraîne le pipeline.

    Par défaut, utiliser get_core_feature_columns() ou
    select_features_for_dataset() pour feature_cols — pas get_feature_columns()
    qui inclut tout (trop de bruit).
    """
    available_features = [c for c in feature_cols if c in df_train.columns]

    X_train = df_train[available_features].values
    y_train = df_train["is_pro"].values.astype(int)

    pipeline = build_pipeline()

    print(f"Entraînement sur {len(X_train)} exemples, {len(available_features)} features...")
    pipeline.fit(X_train, y_train)
    print("Entraînement terminé.")

    return pipeline, available_features


# ---------------------------------------------------------------------------
# Seuil adaptatif
# ---------------------------------------------------------------------------

def find_optimal_threshold(
    pipeline: Pipeline,
    df_train: pd.DataFrame,
    feature_cols: list[str],
) -> float:
    """
    Trouve le seuil optimal sur le train set via validation croisée.
    Maximise le F1-score de la classe pro.
    """
    available = [c for c in feature_cols if c in df_train.columns]
    X = df_train[available].values
    y = df_train["is_pro"].values.astype(int)

    cv = RepeatedStratifiedKFold(n_splits=7, n_repeats=3, random_state=42)
    proba_buckets = [[] for _ in range(len(y))]

    for train_idx, val_idx in cv.split(X, y):
        pipe_cv = build_pipeline()
        pipe_cv.fit(X[train_idx], y[train_idx])
        fold_probas = pipe_cv.predict_proba(X[val_idx])[:, 1]
        for idx, p in zip(val_idx, fold_probas):
            proba_buckets[idx].append(float(p))

    probas = np.array([
        float(np.mean(bucket)) if bucket else 0.0
        for bucket in proba_buckets
    ])

    thresholds = np.linspace(0.03, 0.70, 120)
    best_f1, best_threshold = 0.0, 0.25

    for t in thresholds:
        preds = (probas >= t).astype(int)
        tp = ((preds == 1) & (y == 1)).sum()
        fp = ((preds == 1) & (y == 0)).sum()
        fn = ((preds == 0) & (y == 1)).sum()
        if tp == 0:
            continue
        prec = tp / (tp + fp)
        rec  = tp / (tp + fn)
        f1   = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
        if f1 > best_f1:
            best_f1, best_threshold = f1, t

    print(f"Seuil optimal : {best_threshold:.2f}  "
          f"(F1 pro CV : {best_f1:.3f})")
    return best_threshold


# ---------------------------------------------------------------------------
# Évaluation
# ---------------------------------------------------------------------------

def evaluate_model(
    pipeline: Pipeline,
    df_test: pd.DataFrame,
    feature_cols: list[str],
    threshold: float = 0.25,
    plot: bool = True,
) -> dict:
    available = [c for c in feature_cols if c in df_test.columns]
    X_test = df_test[available].values
    y_test = df_test["is_pro"].values.astype(int)

    y_prob = pipeline.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= threshold).astype(int)

    auc_roc  = roc_auc_score(y_test, y_prob)
    avg_prec = average_precision_score(y_test, y_prob)

    print("\n" + "="*50)
    print("RÉSULTATS D'ÉVALUATION")
    print("="*50)
    print(f"Seuil utilisé        : {threshold:.2f}")
    print(f"AUC-ROC              : {auc_roc:.3f}")
    print(f"Average Precision    : {avg_prec:.3f}")
    print()
    print(classification_report(
        y_test, y_pred,
        target_names  = ["Non-pro", "Pro"],
        zero_division = 0,
    ))

    if plot:
        _plot_evaluation(y_test, y_prob, threshold)

    return {
        "auc_roc":           auc_roc,
        "average_precision": avg_prec,
        "threshold":         threshold,
        "y_test":            y_test,
        "y_prob":            y_prob,
        "y_pred":            y_pred,
    }


def _plot_evaluation(y_test, y_prob, threshold: float = 0.25):
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    RocCurveDisplay.from_predictions(y_test, y_prob, ax=axes[0])
    axes[0].set_title("Courbe ROC")
    axes[0].plot([0, 1], [0, 1], "k--", alpha=0.4, label="Aléatoire")
    axes[0].legend()

    prec, rec, thresholds_pr = precision_recall_curve(y_test, y_prob)
    axes[1].plot(rec, prec, color="steelblue", lw=2)

    if len(thresholds_pr) > 0:
        idx = np.argmin(np.abs(thresholds_pr - threshold))
        axes[1].scatter(rec[idx], prec[idx], color="coral",
                        zorder=5, s=80, label=f"Seuil={threshold:.2f}")

    axes[1].set_xlabel("Rappel")
    axes[1].set_ylabel("Précision")
    axes[1].set_title("Courbe Précision / Rappel")
    axes[1].set_xlim([0, 1])
    axes[1].set_ylim([0, 1])
    axes[1].legend()
    axes[1].grid(alpha=0.3)

    plt.tight_layout()
    plt.show()


# ---------------------------------------------------------------------------
# Feature Importance
# ---------------------------------------------------------------------------

def plot_feature_importance(
    pipeline: Pipeline,
    feature_cols: list[str],
    top_n: int = 20,
) -> dict:
    clf         = pipeline.named_steps["clf"]
    importances = clf.feature_importances_

    top_n   = min(top_n, len(feature_cols))
    indices = np.argsort(importances)[::-1][:top_n]

    top_features   = [feature_cols[i] for i in indices]
    top_values     = importances[indices]
    top_values_pct = (top_values / top_values.sum()) * 100

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(range(top_n), top_values_pct[::-1], color="steelblue", alpha=0.8)
    ax.set_yticks(range(top_n))
    ax.set_yticklabels([top_features[top_n - 1 - i] for i in range(top_n)])
    ax.set_xlabel("Importance relative (%)")
    ax.set_title(f"Top {top_n} features — importance relative")
    ax.xaxis.set_major_formatter(mticker.FormatStrFormatter("%.1f%%"))
    ax.grid(axis="x", alpha=0.3)
    plt.tight_layout()
    plt.show()

    return dict(zip(top_features, top_values))


# ---------------------------------------------------------------------------
# SHAP
# ---------------------------------------------------------------------------

def explain_player(
    pipeline: Pipeline,
    df: pd.DataFrame,
    player_id: str,
    feature_cols: list[str],
    snapshot_index: int = -1,
):
    if not SHAP_AVAILABLE:
        print("SHAP non disponible : pip install shap")
        return

    player_df = df[df["player_id"] == player_id].sort_values("age")
    if player_df.empty:
        print(f"Joueur {player_id} introuvable.")
        return

    snapshot  = player_df.iloc[snapshot_index]
    available = [c for c in feature_cols if c in df.columns]
    X_player  = snapshot[available].values.reshape(1, -1)

    X_transformed = pipeline[:-1].transform(X_player)
    clf           = pipeline.named_steps["clf"]

    explainer   = shap.TreeExplainer(clf)
    shap_values = explainer.shap_values(X_transformed)

    proba        = pipeline.predict_proba(X_player)[0][1]
    age          = snapshot["age"]
    reliability  = snapshot.get("score_reliability", "?")
    scout_alert  = snapshot.get("scout_alert", None)
    is_pro_label = "PRO" if snapshot.get("is_pro") == 1 else "Non-pro"

    print(f"\nJoueur : {player_id} | Âge : {age:.1f} | Statut réel : {is_pro_label}")
    print(f"Score ML objectif : {proba:.1%}  |  Fiabilité : {reliability}")
    if scout_alert == "scout_confirme":
        print("Scout : confirme le potentiel (note >= 8.0)")
    elif scout_alert == "scout_alerte":
        print("Scout : signale des inquiétudes (note <= 4.0)")
    elif scout_alert is None:
        print("Scout : aucune observation disponible")

    shap_vals = shap_values[1] if isinstance(shap_values, list) else shap_values
    shap.waterfall_plot(
        shap.Explanation(
            values        = shap_vals[0],
            base_values   = (
                explainer.expected_value[1]
                if isinstance(explainer.expected_value, list)
                else explainer.expected_value
            ),
            data          = X_transformed[0],
            feature_names = available,
        ),
        max_display=15,
    )


# ---------------------------------------------------------------------------
# Score de potentiel avec fiabilité et alerte scout
# ---------------------------------------------------------------------------

def predict_potential(
    pipeline: Pipeline,
    df: pd.DataFrame,
    feature_cols: list[str],
) -> pd.DataFrame:
    """
    Calcule le score de potentiel objectif (0-100) + indicateurs de contexte.

    Colonnes retournées :
    - potential_score    : score ML objectif basé sur données mesurables
    - score_reliability  : 'high' / 'medium' / 'low'
    - scout_coverage     : nombre d'observations scout disponibles
    - scout_alert        : 'scout_confirme' / 'scout_alerte' / None
    - is_pro             : label réel si disponible
    """
    available = [c for c in feature_cols if c in df.columns]
    X         = df[available].values
    probas    = pipeline.predict_proba(X)[:, 1]

    result = df[["player_id", "age", "season"]].copy()
    result["potential_score"] = (probas * 100).round(1)

    # Indicateurs de contexte (affichage uniquement, pas dans le calcul ML)
    if "score_reliability" in df.columns:
        result["score_reliability"] = df["score_reliability"].values
    if "scout_coverage" in df.columns:
        result["scout_coverage"] = df["scout_coverage"].values
    if "scout_alert" in df.columns:
        result["scout_alert"] = df["scout_alert"].values
    if "is_pro" in df.columns:
        result["is_pro"] = df["is_pro"].values

    return result.sort_values("potential_score", ascending=False)