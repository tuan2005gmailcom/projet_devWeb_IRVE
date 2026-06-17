# -*- coding: utf-8 -*-

import sys
import json
import warnings
from pathlib import Path

import joblib
import pandas as pd
import numpy as np

try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except Exception:
    warnings.filterwarnings("ignore")


# =========================================================
# 1. Chemins des fichiers
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

CONFIG_CANDIDATES = [
    BASE_DIR / "model_config.pkl",
    BASE_DIR / "model_config(1).pkl",
]

MODEL_FILES = {
    "Random Forest": [
        BASE_DIR / "random_forest_puissance.pkl",
        BASE_DIR / "random_forest_puissance(1).pkl",
    ],
    "Decision Tree": [
        BASE_DIR / "decision_tree_puissance.pkl",
    ],
    "Linear Regression": [
        BASE_DIR / "linear_regression_puissance.pkl",
    ],
}


def first_existing(paths):
    for path in paths:
        if path.exists():
            return path
    return None


config_path = first_existing(CONFIG_CANDIDATES)

if config_path is None:
    print(json.dumps({
        "success": False,
        "error": "model_config.pkl introuvable dans le dossier python/puissance."
    }, ensure_ascii=False))
    sys.exit(1)

try:
    config = joblib.load(config_path)
except Exception as exc:
    print(json.dumps({
        "success": False,
        "error": "Impossible de charger model_config.pkl.",
        "details": str(exc)
    }, ensure_ascii=False))
    sys.exit(1)

features = config.get("features", [])
numeric_cols = config.get("numeric_cols", [])
categorical_cols = config.get("categorical_cols", [])

models = {}

for model_name, paths in MODEL_FILES.items():
    model_path = first_existing(paths)

    if model_path is None:
        continue

    try:
        models[model_name] = joblib.load(model_path)
    except Exception as exc:
        models[model_name] = {
            "__load_error__": str(exc)
        }

if not models:
    print(json.dumps({
        "success": False,
        "error": "Aucun modèle puissance trouvé."
    }, ensure_ascii=False))
    sys.exit(1)


# =========================================================
# 2. Fonctions de nettoyage
# =========================================================

def convert_bool_to_01(x):
    if pd.isna(x):
        return np.nan

    x = str(x).strip().lower()

    if x in ["true", "1", "yes", "oui", "y"]:
        return 1

    if x in ["false", "0", "no", "non", "n"]:
        return 0

    return np.nan


def clean_condition_acces(value):
    value = str(value).strip()

    replacements = {
        "AccĂ¨s libre": "Accès libre",
        "Acc¸s libre": "Accès libre",
        "Accs libre": "Accès libre",
        "Acces libre": "Accès libre",
        "Accès libre": "Accès libre",
        "Acces réservé": "Accès réservé",
        "Acces reserve": "Accès réservé",
        "Accès réservé": "Accès réservé",
    }

    if value in replacements:
        return replacements[value]

    low = value.lower()

    if "libre" in low:
        return "Accès libre"

    if "réserv" in low or "reserv" in low:
        return "Accès réservé"

    return "unknown"


def clean_implantation_station(value):
    value = str(value).strip()

    replacements = {
        "Parking priv  usage public": "Parking privé à usage public",
        "Parking privé à usage public": "Parking privé à usage public",
        "Parking priv rserv  la clientle": "Parking privé réservé à la clientèle",
        "Parking privé réservé à la clientèle": "Parking privé réservé à la clientèle",
        "Voirie": "Voirie",
        "Parking public": "Parking public",
        "Station dédiée à la recharge rapide": "Station dédiée à la recharge rapide",
    }

    if value in replacements:
        return replacements[value]

    return value if value else "unknown"


def get_input_value(data, key, default=None):
    return data[key] if key in data and data[key] not in ["", None] else default


def prepare_input(data):
    """
    Prépare une ligne de données pour les modèles de régression puissance.
    Les colonnes doivent rester compatibles avec model_config.pkl.
    """

    df = pd.DataFrame([data])

    # Valeurs alternatives venant des paramètres URL
    if "consolidated_longitude" not in df.columns and "lon" in df.columns:
        df["consolidated_longitude"] = df["lon"]

    if "consolidated_latitude" not in df.columns and "lat" in df.columns:
        df["consolidated_latitude"] = df["lat"]

    if "nbre_pdc" not in df.columns and "points" in df.columns:
        df["nbre_pdc"] = df["points"]

    # Harmoniser les catégories
    if "condition_acces" in df.columns:
        df["condition_acces"] = df["condition_acces"].apply(clean_condition_acces)
    else:
        df["condition_acces"] = "unknown"

    if "implantation_station" in df.columns:
        df["implantation_station"] = df["implantation_station"].apply(clean_implantation_station)
    else:
        df["implantation_station"] = "unknown"

    # Colonnes booléennes
    bool_cols = [
        "prise_type_ef",
        "prise_type_2",
        "prise_type_combo_ccs",
        "prise_type_chademo",
        "prise_type_autre",
        "station_deux_roues",
    ]

    for col in bool_cols:
        if col in df.columns:
            df[col] = df[col].apply(convert_bool_to_01)
        else:
            df[col] = np.nan

    # is_24_7 depuis horaires
    if "horaires" in df.columns:
        horaires_clean = df["horaires"].astype("string").str.lower().str.strip()

        df["is_24_7"] = horaires_clean.str.contains(
            r"24/7|00:00-24:00|00:00-23:59|mo-su 00:00",
            regex=True,
            na=False
        ).astype(int)
    else:
        df["is_24_7"] = np.nan

    # gratuit_num
    if "gratuit" in df.columns:
        df["gratuit_num"] = (
            df["gratuit"]
            .astype("string")
            .str.lower()
            .str.strip()
            .map({
                "true": 1,
                "false": 0,
                "1": 1,
                "0": 0,
                "oui": 1,
                "non": 0,
                "yes": 1,
                "no": 0,
            })
        )
    else:
        df["gratuit_num"] = np.nan

    # has_tarification
    if "tarification" in df.columns:
        tarif_clean = df["tarification"].astype("string").str.strip()

        tarif_present = (
            tarif_clean.notna()
            & (tarif_clean != "")
            & (~tarif_clean.str.lower().isin(["nan", "none", "null", "non renseigné"]))
        )
    else:
        tarif_present = pd.Series([False], index=df.index)

    df["has_tarification"] = (tarif_present | (df["gratuit_num"] == 0)).astype(int)

    # nb_types_prises
    prise_cols = [
        "prise_type_ef",
        "prise_type_2",
        "prise_type_combo_ccs",
        "prise_type_chademo",
        "prise_type_autre",
    ]

    df["nb_types_prises"] = df[prise_cols].sum(axis=1)

    # Ajouter colonnes manquantes
    for col in features:
        if col not in df.columns:
            df[col] = np.nan

    X_input = df[features].copy()

    # Convertir les colonnes numériques
    for col in numeric_cols:
        if col in X_input.columns:
            X_input[col] = pd.to_numeric(X_input[col], errors="coerce")

    # Forcer les colonnes catégorielles en texte
    for col in categorical_cols:
        if col in X_input.columns:
            X_input[col] = X_input[col].astype("string").fillna("unknown")

    return X_input


# =========================================================
# 3. Lire JSON depuis PHP / terminal
# =========================================================

try:
    raw_input = sys.stdin.read().strip()

    if not raw_input:
        raise ValueError("Aucun JSON reçu.")

    client_request = json.loads(raw_input)

except Exception as exc:
    print(json.dumps({
        "success": False,
        "error": "Invalid JSON input",
        "details": str(exc)
    }, ensure_ascii=False))
    sys.exit(1)


# =========================================================
# 4. Prédictions avec tous les modèles
# =========================================================

try:
    X_input = prepare_input(client_request)

    model_results = {}
    successful_predictions = []

    for model_name, model in models.items():
        if isinstance(model, dict) and "__load_error__" in model:
            model_results[model_name] = {
                "success": False,
                "error": model["__load_error__"]
            }
            continue

        try:
            prediction = model.predict(X_input)[0]
            prediction = round(float(prediction), 2)

            model_results[model_name] = {
                "success": True,
                "prediction": prediction,
                "unit": "kW"
            }

            successful_predictions.append(prediction)

        except Exception as exc:
            model_results[model_name] = {
                "success": False,
                "error": str(exc)
            }

    if not successful_predictions:
        print(json.dumps({
            "success": False,
            "error": "Aucun modèle n'a réussi à prédire.",
            "models": model_results
        }, ensure_ascii=False))
        sys.exit(1)

    # Résultat principal :
    # priorité au Random Forest, sinon moyenne des modèles qui marchent.
    if (
        "Random Forest" in model_results
        and model_results["Random Forest"].get("success") is True
    ):
        final_prediction = model_results["Random Forest"]["prediction"]
        final_method = "Random Forest"
    else:
        final_prediction = round(float(np.mean(successful_predictions)), 2)
        final_method = "Average of available models"

    average_prediction = round(float(np.mean(successful_predictions)), 2)

    print(json.dumps({
        "success": True,

        # Compatible avec ton ancien JS
        "predicted_puissance_nominale": final_prediction,

        # Nouveau format détaillé
        "final_prediction": final_prediction,
        "final_method": final_method,
        "average_prediction": average_prediction,
        "unit": "kW",
        "models": model_results
    }, ensure_ascii=False))

except Exception as exc:
    print(json.dumps({
        "success": False,
        "error": "Prediction failed",
        "details": str(exc)
    }, ensure_ascii=False))
    sys.exit(1)
