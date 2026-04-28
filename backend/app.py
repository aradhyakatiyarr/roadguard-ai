from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import hashlib
import os
import numpy as np
import joblib
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ── Load ML model once at startup ───────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
try:
    risk_model   = joblib.load(os.path.join(MODEL_DIR, "risk_model.pkl"))
    encoders     = joblib.load(os.path.join(MODEL_DIR, "encoders.pkl"))
    print("✅  ML model loaded.")
except Exception as e:
    risk_model = None
    encoders   = {}
    print(f"⚠️  ML model not found: {e}")

ADMIN_EMAIL    = "admin@panel.com"
ADMIN_PASSWORD = "Admin@123"

DATABASE = "users.db"

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                name     TEXT    NOT NULL,
                email    TEXT    UNIQUE NOT NULL,
                password TEXT    NOT NULL,
                joined   DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
    print("✅  Database ready.")

# Initialize DB on startup
init_db()

@app.route("/")
def index():
    return jsonify({"status": "RoadGuard AI Backend is running"})

@app.route("/api/register", methods=["POST"])
def register():
    data     = request.get_json()
    name     = data.get("name", "").strip()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"success": False, "message": "All fields are required."}), 400
    if len(password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400
    if email == ADMIN_EMAIL.lower():
        return jsonify({"success": False, "message": "This email is not allowed."}), 400

    hashed_pw = hash_password(password)
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                (name, email, hashed_pw)
            )
            conn.commit()
        return jsonify({"success": True, "message": "Registered successfully! Please log in."})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "This email is already registered."}), 409

@app.route("/api/login", methods=["POST"])
def login():
    data     = request.get_json()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    if email == ADMIN_EMAIL.lower() and password == ADMIN_PASSWORD:
        return jsonify({"success": True, "role": "admin", "name": "Admin"})

    hashed_pw = hash_password(password)
    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ? AND password = ?",
            (email, hashed_pw)
        ).fetchone()

    if user:
        return jsonify({"success": True, "role": "user", "name": user["name"]})
    else:
        return jsonify({"success": False, "message": "Incorrect email or password."}), 401

@app.route("/api/users", methods=["GET"])
def get_users():
    with get_db() as conn:
        users = conn.execute(
            "SELECT id, name, email, joined FROM users ORDER BY joined DESC"
        ).fetchall()
    users_list = [dict(row) for row in users]
    return jsonify({"success": True, "users": users_list})

@app.route("/api/predict", methods=["POST"])
def predict():
    if risk_model is None:
        return jsonify({"message": "Model not loaded. Run train_model.py first."}), 503

    d = request.get_json()

    weather      = d.get("weather", "clear")
    traffic      = d.get("traffic", "medium")
    road_type    = d.get("roadType", "urban")
    visibility   = d.get("visibility", "good")
    speed_limit  = int(d.get("speedLimit", 50))
    driver_age   = d.get("driverAge", "25-45")
    vehicle_type = d.get("vehicleType", "car")
    weather_label = d.get("weatherLabel", weather)
    location     = d.get("location", "Unknown location")

    if vehicle_type == "suv":
        vehicle_type = "car"

    age_map = {"16-24": 20, "25-45": 35, "46-65": 55, "65+": 72}
    driver_age_num = age_map.get(driver_age, 35)

    try:
        dt = datetime.strptime(f"{d.get('date','')} {d.get('time','')}", "%Y-%m-%d %H:%M")
    except Exception:
        dt = datetime.now()
    hour        = dt.hour
    dow         = dt.weekday()
    is_weekend  = int(dow >= 5)
    is_rush     = int((7 <= hour <= 9) or (17 <= hour <= 19))
    is_night    = int(hour < 6 or hour >= 22)

    def enc(col, val):
        try:
            return int(encoders[col].transform([val])[0])
        except Exception:
            return 0

    X = np.array([[
        hour, dow, is_weekend, is_rush, is_night,
        enc("weather", weather),
        enc("traffic", traffic),
        enc("road_type", road_type),
        enc("visibility", visibility),
        speed_limit,
        driver_age_num,
        enc("vehicle_type", vehicle_type),
    ]])

    label      = int(risk_model.predict(X)[0])
    proba      = risk_model.predict_proba(X)[0]
    risk_level = ["Low", "Medium", "High"][label]
    risk_pct   = int(round(proba[1] * 50 + proba[2] * 100))

    weather_scores  = {"clear":0,"partly_cloudy":2,"overcast":3,"drizzle":8,
                       "rainy":15,"heavy_rain":25,"foggy":30,"snowy":22,"stormy":35}
    vehicle_scores  = {"car":0,"suv":2,"bus":4,"truck":8,"bicycle":12,"motorcycle":28}
    time_score      = (22 if is_night else 13 if is_rush else 0) + (8 if is_night and is_weekend else 0)
    traffic_score   = {"low":0,"medium":7,"high":18}.get(traffic, 0)
    driver_score    = {20:20,35:0,55:0,72:15}.get(driver_age_num, 0)

    risk_breakdown = {
        "weather":   min(weather_scores.get(weather, 0), 35),
        "timeOfDay": min(time_score, 30),
        "traffic":   min(traffic_score, 20),
        "vehicle":   min(vehicle_scores.get(d.get("vehicleType","car"), 0), 30),
        "driver":    min(driver_score, 20),
    }

    factors = []
    if weather == "heavy_rain":
        factors.append("Heavy rain increases accident risk 6x and greatly reduces stopping distance")
    elif weather == "foggy":
        factors.append("Fog causes 10x risk increase — the most dangerous weather condition")
    elif weather == "stormy":
        factors.append("Thunderstorms are 8x more dangerous due to reduced visibility and slick roads")
    elif weather == "snowy":
        factors.append("Snow and ice increase stopping distance by up to 10x")
    elif weather == "rainy":
        factors.append("Rain reduces grip and increases stopping distance by 4x")

    if is_night:
        factors.append(f"Night driving (current hour: {hour:02d}:00) carries 3x higher fatality risk")
    elif is_rush:
        factors.append(f"Rush hour at {hour:02d}:00 accounts for 40% of all daily accidents")
    if is_night and is_weekend:
        factors.append("Weekend nights have 3x higher drunk-driving rates")
    if d.get("vehicleType") == "motorcycle":
        factors.append("Motorcycles have 29x higher fatality rate compared to cars")
    elif d.get("vehicleType") == "bicycle":
        factors.append("Cyclists are among the most vulnerable road users with no collision protection")
    if driver_age == "16-24":
        factors.append("Drivers aged 16–24 have a 3x higher crash rate than the average driver")
    elif driver_age == "65+":
        factors.append("Drivers 65+ face 2x higher accident risk due to reduced reaction time")
    if visibility in ("poor", "very_poor"):
        factors.append(f"{visibility.replace('_',' ').title()} visibility significantly raises collision risk")
    if road_type == "mountain":
        factors.append("Mountain roads have 2.5x higher fatality rate than urban streets")
    if traffic == "high":
        factors.append("High traffic density increases rear-end and lane-change collision probability")
    if speed_limit >= 120:
        factors.append(f"{speed_limit} km/h speed limit means greatly increased crash severity")
    elif speed_limit >= 100:
        factors.append(f"{speed_limit} km/h speed limit requires longer stopping distances")
    if not factors:
        factors.append(f"Conditions are typical for a {risk_level.lower()}-risk {road_type} trip")

    top_factors = factors[:3]

    recs = []
    if weather == "foggy":
        recs.append("Use fog lights, reduce speed below 50 km/h, and avoid overtaking")
    elif weather in ("snowy", "stormy"):
        recs.append("Consider postponing; if driving, use winter tyres and halve your speed")
    elif weather in ("rainy", "heavy_rain"):
        recs.append("Reduce speed by 30% and keep a 4-second following distance")
    if is_night:
        recs.append("Ensure headlights are on and clean; take breaks every 90 minutes to avoid fatigue")
    if is_rush:
        recs.append("Leave 30–45 minutes earlier or later to avoid peak accident window")
    if traffic == "high":
        recs.append("Maintain a 3-second gap ahead and stay in one lane where possible")
    if d.get("vehicleType") == "motorcycle":
        recs.append("Wear full protective gear: helmet, jacket, gloves, and boots")
    if visibility in ("poor", "very_poor"):
        recs.append("Use headlights even in daylight and activate hazard lights below 100 m visibility")
    if speed_limit >= 100:
        recs.append("Stay strictly within the speed limit and use cruise control on open roads")
    recs.append("Check tyre pressure, mirrors, and fuel before departure")
    recommendations = recs[:3]

    time_ctx = "at night" if is_night else "during rush hour" if is_rush else "during off-peak hours"
    explanation = (
        f"This {road_type} trip from {location} {time_ctx} with {weather_label} weather "
        f"and {traffic} traffic is rated {risk_level} risk at {risk_pct}%. "
        f"{top_factors[0]}."
    )

    safe_to_travel = risk_level != "High"
    alt = ""
    if risk_level == "High":
        if weather in ("foggy", "stormy", "heavy_rain", "snowy"):
            alt = f"Strongly consider delaying until weather improves in {location}."
        elif is_night:
            alt = "Travelling after sunrise would substantially reduce risk."
        else:
            alt = "Consider public transport or a lower-speed alternative route."
    elif risk_level == "Medium":
        if is_rush:
            alt = "Leaving 45 minutes earlier or later would avoid peak traffic."
        elif is_night:
            alt = "Travelling after sunrise would reduce risk to Low."

    return jsonify({
        "riskLevel":            risk_level,
        "riskPercentage":       risk_pct,
        "explanation":          explanation,
        "topFactors":           top_factors,
        "recommendations":      recommendations,
        "safeToTravel":         safe_to_travel,
        "alternativeSuggestion": alt,
        "riskBreakdown":        risk_breakdown,
    })

if __name__ == "__main__":
    print("🚀  Server running at http://127.0.0.1:5000")
    app.run(debug=True)
