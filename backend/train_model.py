"""
RoadGuard AI - ML Model Training Script
Run: python train_model.py
Output: model/risk_model.pkl + model/encoders.pkl
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import os
import json

os.makedirs('model', exist_ok=True)

print("🔨 Generating synthetic accident dataset...")

# ─── GENERATE SYNTHETIC DATA ───
# Based on real accident statistics:
# - WHO Global Status Report on Road Safety
# - NHTSA (US) crash statistics
# - UK Department for Transport data

np.random.seed(42)
N = 50000  # 50,000 samples

def gen_dataset(n):
    data = []
    for _ in range(n):
        # Independent features
        hour = np.random.randint(0, 24)
        day_of_week = np.random.randint(0, 7)
        is_weekend = int(day_of_week >= 5)
        is_rush_hour = int((7 <= hour <= 9) or (17 <= hour <= 19))
        is_night = int(hour < 6 or hour >= 22)
        
        weather = np.random.choice(
            ['clear', 'partly_cloudy', 'overcast', 'drizzle', 'rainy', 'heavy_rain', 'foggy', 'snowy', 'stormy'],
            p=[0.30, 0.18, 0.12, 0.08, 0.12, 0.05, 0.05, 0.05, 0.05]
        )
        traffic = np.random.choice(['low', 'medium', 'high'], p=[0.35, 0.40, 0.25])
        road_type = np.random.choice(['urban', 'highway', 'rural', 'mountain'], p=[0.50, 0.25, 0.18, 0.07])
        visibility = np.random.choice(['good', 'moderate', 'poor', 'very_poor'], p=[0.60, 0.20, 0.12, 0.08])
        speed_limit = np.random.choice([30, 50, 80, 100, 120], p=[0.15, 0.35, 0.25, 0.15, 0.10])
        driver_age_num = np.random.choice([20, 35, 55, 72],
                                          p=[0.15, 0.50, 0.25, 0.10])
        vehicle_type = np.random.choice(
            ['car', 'motorcycle', 'truck', 'bus', 'bicycle'],
            p=[0.65, 0.12, 0.10, 0.08, 0.05]
        )
        
        # ─── RISK SCORING (based on accident statistics) ───
        score = 10
        
        # Weather risk (rain 4x, fog 10x, storm 8x)
        weather_risk = {
            'clear': 0, 'partly_cloudy': 2, 'overcast': 5,
            'drizzle': 10, 'rainy': 18, 'heavy_rain': 28,
            'foggy': 32, 'snowy': 25, 'stormy': 38
        }
        score += weather_risk.get(weather, 0)
        
        # Time risk
        if is_night: score += 22       # Night: 3x higher fatality
        if is_rush_hour: score += 13   # Rush: congestion accidents
        if is_weekend: score -= 4      # Fewer commuters
        
        # Traffic
        if traffic == 'high': score += 18
        elif traffic == 'medium': score += 7
        
        # Visibility
        vis_risk = {'good': 0, 'moderate': 8, 'poor': 18, 'very_poor': 30}
        score += vis_risk.get(visibility, 0)
        
        # Speed (exponential injury severity)
        if speed_limit >= 120: score += 22
        elif speed_limit >= 100: score += 14
        elif speed_limit >= 80: score += 7
        elif speed_limit <= 30: score -= 5
        
        # Vehicle type (motorcycle 29x fatality)
        vehicle_risk = {'car': 0, 'bicycle': 12, 'motorcycle': 28, 'truck': 8, 'bus': 4}
        score += vehicle_risk.get(vehicle_type, 0)
        
        # Driver age (young/old drivers more at risk)
        if driver_age_num <= 20: score += 20
        elif driver_age_num <= 25: score += 12
        elif driver_age_num >= 70: score += 15
        elif driver_age_num >= 65: score += 8
        
        # Road type
        road_risk = {'urban': 0, 'highway': 6, 'rural': 12, 'mountain': 20}
        score += road_risk.get(road_type, 0)
        
        # Add realistic noise
        score += np.random.normal(0, 8)
        score = max(0, min(100, score))
        
        # Convert to risk class with some noise
        noise = np.random.normal(0, 5)
        final_score = score + noise
        if final_score < 35: risk = 0   # Low
        elif final_score < 65: risk = 1  # Medium
        else: risk = 2                   # High
        
        data.append({
            'hour': hour, 'day_of_week': day_of_week,
            'is_weekend': is_weekend, 'is_rush_hour': is_rush_hour, 'is_night': is_night,
            'weather': weather, 'traffic': traffic, 'road_type': road_type,
            'visibility': visibility, 'speed_limit': speed_limit,
            'driver_age_num': driver_age_num, 'vehicle_type': vehicle_type,
            'risk': risk
        })
    
    return pd.DataFrame(data)

df = gen_dataset(N)
print(f"✅ Dataset generated: {len(df)} rows")
print(f"   Distribution: Low={sum(df.risk==0)}, Medium={sum(df.risk==1)}, High={sum(df.risk==2)}")

# ─── ENCODE CATEGORICAL FEATURES ───
cat_cols = ['weather', 'traffic', 'road_type', 'visibility', 'vehicle_type']
encoders = {}
for col in cat_cols:
    le = LabelEncoder()
    df[col + '_enc'] = le.fit_transform(df[col])
    encoders[col] = le

# ─── FEATURES & LABELS ───
feature_cols = [
    'hour', 'day_of_week', 'is_weekend', 'is_rush_hour', 'is_night',
    'weather_enc', 'traffic_enc', 'road_type_enc', 'visibility_enc',
    'speed_limit', 'driver_age_num', 'vehicle_type_enc'
]
X = df[feature_cols].values
y = df['risk'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ─── TRAIN RANDOM FOREST ───
print("\n🌲 Training Random Forest Classifier...")
rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=4,
    min_samples_leaf=2,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train, y_train)

# ─── TRAIN GRADIENT BOOSTING ───
print("⚡ Training Gradient Boosting Classifier...")
gb = GradientBoostingClassifier(
    n_estimators=150,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    random_state=42
)
gb.fit(X_train, y_train)

# ─── EVALUATE ───
print("\n📊 Model Evaluation:")
for name, model in [('Random Forest', rf), ('Gradient Boosting', gb)]:
    score = model.score(X_test, y_test)
    cv = cross_val_score(model, X, y, cv=5, scoring='accuracy').mean()
    print(f"\n{name}:")
    print(f"  Test Accuracy: {score:.4f} ({score*100:.1f}%)")
    print(f"  CV Accuracy:   {cv:.4f} ({cv*100:.1f}%)")
    print(classification_report(y_test, model.predict(X_test),
          target_names=['Low', 'Medium', 'High']))

# ─── FEATURE IMPORTANCE ───
print("\n🔍 Top Feature Importances (Random Forest):")
importance = sorted(zip(feature_cols, rf.feature_importances_), key=lambda x: -x[1])
for feat, imp in importance[:8]:
    bar = '█' * int(imp * 50)
    print(f"  {feat:<20} {bar} {imp:.4f}")

# ─── SAVE BEST MODEL ───
# Choose better model
best_model = rf if rf.score(X_test, y_test) >= gb.score(X_test, y_test) else gb
best_name = 'Random Forest' if best_model is rf else 'Gradient Boosting'
print(f"\n💾 Saving best model: {best_name}")

joblib.dump(best_model, 'model/risk_model.pkl')
joblib.dump(encoders, 'model/encoders.pkl')

# Save metadata
meta = {
    'model': best_name,
    'accuracy': float(best_model.score(X_test, y_test)),
    'features': feature_cols,
    'categories': {col: list(encoders[col].classes_) for col in cat_cols},
    'trained_on': N,
    'classes': ['Low', 'Medium', 'High']
}
with open('model/metadata.json', 'w') as f:
    json.dump(meta, f, indent=2)

print("✅ Model saved to model/risk_model.pkl")
print("✅ Encoders saved to model/encoders.pkl")
print("✅ Metadata saved to model/metadata.json")
print(f"\n🎉 Training complete! Model accuracy: {best_model.score(X_test, y_test)*100:.1f}%")
