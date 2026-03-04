import pandas as pd
import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, log_loss
import xgboost as xgb
import pickle
import os

print("Loading data...")
col_names = ["click"] + [f"num_{i}" for i in range(13)] + [f"cat_{i}" for i in range(26)]
df = pd.read_csv("data/dac/train.txt", sep="\t", header=None, names=col_names, nrows=500_000)

df = df.drop(columns=['num_11'])
num_cols = [f'num_{i}' for i in range(13) if i != 11]
cat_cols = [f'cat_{i}' for i in range(26)]

num_imputer = SimpleImputer(strategy='median')
df[num_cols] = num_imputer.fit_transform(df[num_cols])
df[cat_cols] = df[cat_cols].fillna('unknown')

freq_encoders = {}
for col in cat_cols:
    freq_map = df[col].value_counts(normalize=True).to_dict()
    df[col] = df[col].map(freq_map)
    freq_encoders[col] = freq_map

df['num9_num10_ratio'] = df['num_9'] / (df['num_10'] + 1e-6)
df['num9_num0_interaction'] = df['num_9'] * df['num_0']
df['num_filled_count'] = (df[num_cols] != 0).sum(axis=1)
for col in ['num_0', 'num_1', 'num_2', 'num_3', 'num_9', 'num_10']:
    df[f'{col}_log'] = np.log1p(df[col])

feature_cols = (
    num_cols + cat_cols +
    ['num9_num10_ratio', 'num9_num0_interaction', 'num_filled_count'] +
    [f'{c}_log' for c in ['num_0', 'num_1', 'num_2', 'num_3', 'num_9', 'num_10']]
)

X = df[feature_cols].replace([np.inf, -np.inf], 0).fillna(0)
y = df['click']

X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Training set: {X_train.shape}")

print("\nTraining baseline logistic regression...")
baseline = LogisticRegression(max_iter=1000, random_state=42)
baseline.fit(X_train, y_train)
baseline_auc = roc_auc_score(y_val, baseline.predict_proba(X_val)[:, 1])
print(f"Baseline AUC: {baseline_auc:.4f}")

print("\nTraining XGBoost...")
xgb_model = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum(),
    eval_metric='auc',
    random_state=42,
    n_jobs=-1
)
xgb_model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=50)

xgb_auc = roc_auc_score(y_val, xgb_model.predict_proba(X_val)[:, 1])
print(f"\nXGBoost AUC: {xgb_auc:.4f}")
print(f"Improvement: +{((xgb_auc - baseline_auc) / baseline_auc * 100):.1f}%")

os.makedirs("backend", exist_ok=True)
with open("backend/xgb_model.pkl", "wb") as f:
    pickle.dump(xgb_model, f)
with open("backend/feature_cols.pkl", "wb") as f:
    pickle.dump(feature_cols, f)
with open("backend/freq_encoders.pkl", "wb") as f:
    pickle.dump(freq_encoders, f)

print("\nAll models saved to backend/")
