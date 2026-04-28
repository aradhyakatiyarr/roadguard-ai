"""
RoadGuard AI - Model Evaluation on Real Kaggle Data
Dataset : data/Accident_Information.csv  (UK DfT road accidents)
Models  : Logistic Regression | Random Forest | XGBoost
"""

import warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
from sklearn.linear_model    import LogisticRegression
from sklearn.ensemble        import RandomForestClassifier
from sklearn.preprocessing   import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics         import accuracy_score, classification_report
from xgboost                 import XGBClassifier

# ── 1. LOAD DATA ──────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  RoadGuard AI — Model Evaluation on Kaggle Data")
print("="*60)
print("\n📂 Loading data/Accident_Information.csv ...")

df = pd.read_csv("data/Accident_Information.csv", low_memory=False)
print(f"   Rows loaded : {len(df):,}")

# ── 2. SELECT FEATURES & TARGET ───────────────────────────────────────────────
FEATURE_COLS = [
    "Speed_limit",
    "Weather_Conditions",
    "Light_Conditions",
    "Road_Surface_Conditions",
    "Road_Type",
    "Urban_or_Rural_Area",
    "Day_of_Week",
    "Junction_Detail",
    "Number_of_Vehicles",
]
TARGET_COL = "Accident_Severity"

# Keep only needed columns, drop missing
df = df[FEATURE_COLS + [TARGET_COL]].dropna()

# Map severity: 1=Fatal → High(2), 2=Serious → Medium(1), 3=Slight → Low(0)
df["risk"] = df[TARGET_COL].map({"Fatal": 2, "Serious": 1, "Slight": 0})
df = df.dropna(subset=["risk"])
df["risk"] = df["risk"].astype(int)

print(f"   After cleaning : {len(df):,} rows")
counts = df["risk"].value_counts().sort_index()
labels = {0: "Low (Slight)", 1: "Medium (Serious)", 2: "High (Fatal)"}
for k, v in counts.items():
    print(f"   {labels[k]:<22}: {v:,}  ({v/len(df)*100:.1f}%)")

# ── 3. ENCODE CATEGORICALS ────────────────────────────────────────────────────
X_cols = []
for col in FEATURE_COLS:
    if not pd.api.types.is_numeric_dtype(df[col]):
        le = LabelEncoder()
        df[col + "_enc"] = le.fit_transform(df[col].astype(str))
        X_cols.append(col + "_enc")
    else:
        X_cols.append(col)

X = df[X_cols].values
y = df["risk"].values

# ── 4. TRAIN / TEST SPLIT ─────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\n   Train : {len(X_train):,}  |  Test : {len(X_test):,}")

# ── 5. TRAIN ALL 3 MODELS ─────────────────────────────────────────────────────
print("\n🔧 Training models ...\n")

models = {
    "Logistic Regression": LogisticRegression(
        max_iter=1000, class_weight="balanced", random_state=42
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=200, max_depth=15, class_weight="balanced",
        random_state=42, n_jobs=-1
    ),
    "XGBoost": XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        use_label_encoder=False, eval_metric="mlogloss",
        random_state=42, n_jobs=-1, verbosity=0
    ),
}

results = {}
trained  = {}
for name, model in models.items():
    print(f"   Training {name} ...", end="", flush=True)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    acc   = accuracy_score(y_test, preds)
    results[name] = acc
    trained[name] = (model, preds)
    print(f"  done  ({acc*100:.2f}%)")

# ── 6. ACCURACY COMPARISON TABLE ─────────────────────────────────────────────
print("\n" + "="*60)
print("  ACCURACY COMPARISON")
print("="*60)
print(f"  {'Model':<25} {'Accuracy':>10}  {'Bar'}")
print("  " + "-"*55)

sorted_results = sorted(results.items(), key=lambda x: -x[1])
for name, acc in sorted_results:
    bar   = "█" * int(acc * 40)
    medal = " 🥇" if name == sorted_results[0][0] else ""
    print(f"  {name:<25} {acc*100:>9.2f}%  {bar}{medal}")

print("="*60)

# ── 7. RANDOM FOREST FULL CLASSIFICATION REPORT ───────────────────────────────
rf_model, rf_preds = trained["Random Forest"]
print("\n" + "="*60)
print("  RANDOM FOREST — CLASSIFICATION REPORT")
print("="*60)
print(classification_report(
    y_test, rf_preds,
    target_names=["Low (Slight)", "Medium (Serious)", "High (Fatal)"],
    digits=4
))
print("="*60 + "\n")
