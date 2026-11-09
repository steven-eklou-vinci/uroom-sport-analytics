import sys
sys.path.insert(0, '.')
from uroom.synthetic import generate_dataset
from uroom.features import build_feature_matrix, get_core_feature_columns
from uroom.model import temporal_train_test_split, train_model, find_optimal_threshold, evaluate_model
import numpy as np

players, snapshots = generate_dataset(n_players=500, pro_ratio=0.12, snapshots_per_player=4)
df = build_feature_matrix(snapshots, players, verbose=False)

print("=== COHEN'S D ===")
feats = ['avg_scout_score', 'pass_accuracy_pct', 'duels_won_pct',
         'endurance_score', 'delta_avg_scout_score', 'delta_pass_accuracy_pct']
for feat in feats:
    if feat in df.columns:
        pm = df[df['is_pro']==1][feat].mean()
        nm = df[df['is_pro']==0][feat].mean()
        d  = (pm - nm) / df[feat].std()
        print(f"  {feat:35s} d={d:+.3f}")

print("\n=== ENTRAÎNEMENT ===")
df_train, df_test = temporal_train_test_split(df, test_ratio=0.20)
feature_cols = get_core_feature_columns(df)
pipeline, used_features = train_model(df_train, feature_cols)
threshold = find_optimal_threshold(pipeline, df_train, used_features)
results = evaluate_model(pipeline, df_test, used_features, threshold=threshold, plot=False)
print(f"\nAUC-ROC   : {results['auc_roc']:.3f}")
print(f"Avg Prec  : {results['average_precision']:.3f}")
print(f"Threshold : {results['threshold']:.2f}")
print(f"F1 Pro    : {results['y_pred'][results['y_test']==1].mean():.3f}")
