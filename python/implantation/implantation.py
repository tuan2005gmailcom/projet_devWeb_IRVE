# -*- coding: utf-8 -*-

import sys
import json
import warnings
from pathlib import Path
from collections import Counter

import joblib
import pandas as pd

try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except Exception:
    warnings.filterwarnings("ignore")


# =========================
# 1. Charger les modèles
# =========================

BASE_DIR = Path(__file__).resolve().parent

MODEL_FILES = {
    "Random Forest": BASE_DIR / "model_implantation_randomforest.pkl",
    "XGBoost": BASE_DIR / "model_implantation_XGBoost.pkl",
}

ENCODER_FILE = BASE_DIR / "label_encoder_implantation.pkl"
FEATURES_FILE = BASE_DIR / "features_implantation.pkl"

try:
    label_encoder = joblib.load(ENCODER_FILE)
    training_features = joblib.load(FEATURES_FILE)
except Exception as exc:
    print(json.dumps({
        "success": False,
        "error": "Impossible de charger label_encoder_implantation.pkl ou features_implantation.pkl",
        "details": str(exc)
    }, ensure_ascii=False))
    sys.exit(1)

models = {}
missing_models = []

for model_name, model_path in MODEL_FILES.items():
    if model_path.exists():
        try:
            models[model_name] = joblib.load(model_path)
        except Exception as exc:
            missing_models.append(f"{model_name}: erreur chargement ({exc})")
    else:
        missing_models.append(f"{model_name}: fichier manquant {model_path.name}")

if not models:
    print(json.dumps({
        "success": False,
        "error": "Aucun modèle implantation trouvé.",
        "missing_models": missing_models
    }, ensure_ascii=False))
    sys.exit(1)


# =========================
# 2. Fonctions utiles
# =========================

def bool_to_int(value):
    value = str(value).lower().strip()

    if value in ["true", "1", "oui", "yes", "y"]:
        return 1

    if value in ["false", "0", "non", "no", "n", "", "none", "null"]:
        return 0

    return 0


def clean_condition_acces(value):
    value = str(value).strip().lower()

    if "libre" in value:
        return "Accès libre"

    if "réserv" in value or "reserv" in value:
        return "Accès réservé"

    return "unknown"


def is_open_24_7(value):
    value = str(value).lower().strip()
    patterns = ["24/7", "00:00-24:00", "00:00-23:59", "mo-su 00:00"]
    return int(any(pattern in value for pattern in patterns))


def decode_prediction(prediction):
    try:
        return str(label_encoder.inverse_transform([int(prediction)])[0])
    except Exception:
        return str(prediction)


def get_probabilities(model, X):
    if not hasattr(model, "predict_proba"):
        return None

    try:
        probabilities = model.predict_proba(X)[0]

        if hasattr(model, "classes_"):
            labels = [decode_prediction(c) for c in model.classes_]
        else:
            labels = [str(label) for label in label_encoder.classes_]

        if len(labels) != len(probabilities):
            labels = [str(label) for label in label_encoder.classes_]

        return {
            label: float(round(prob, 4))
            for label, prob in zip(labels, probabilities)
        }
    except Exception:
        return None


# =========================
# 3. Lire le JSON reçu
# =========================

try:
    raw_input = sys.stdin.read().strip()

    if not raw_input:
        raise ValueError("Aucun JSON reçu.")

    input_data = json.loads(raw_input)
except Exception as exc:
    print(json.dumps({
        "success": False,
        "error": "Invalid JSON input",
        "details": str(exc)
    }, ensure_ascii=False))
    sys.exit(1)


# =========================
# 4. Préparer les variables
# =========================

gratuit_value = bool_to_int(input_data.get("gratuit", 0))
tarification_value = input_data.get("tarification", "")

has_tarification = int(
    (tarification_value is not None and str(tarification_value).strip() != "")
    or gratuit_value == 0
)

row = {
    "nbre_pdc": input_data.get("nbre_pdc", 0),
    "puissance_nominale": input_data.get("puissance_nominale", 0),

    "consolidated_longitude": input_data.get("consolidated_longitude", input_data.get("lon", 0)),
    "consolidated_latitude": input_data.get("consolidated_latitude", input_data.get("lat", 0)),

    "prise_type_ef": bool_to_int(input_data.get("prise_type_ef", 0)),
    "prise_type_2": bool_to_int(input_data.get("prise_type_2", 0)),
    "prise_type_combo_ccs": bool_to_int(input_data.get("prise_type_combo_ccs", 0)),
    "prise_type_chademo": bool_to_int(input_data.get("prise_type_chademo", 0)),
    "prise_type_autre": bool_to_int(input_data.get("prise_type_autre", 0)),

    "gratuit": gratuit_value,
    "station_deux_roues": bool_to_int(input_data.get("station_deux_roues", 0)),

    "condition_acces": clean_condition_acces(input_data.get("condition_acces", "unknown")),
    "has_tarification": has_tarification,
    "is_24_7": is_open_24_7(input_data.get("horaires", "")),
}

X = pd.DataFrame([row])


# =========================
# 5. Prétraitement identique au notebook
# =========================

numeric_features = [
    "nbre_pdc",
    "puissance_nominale",
    "consolidated_longitude",
    "consolidated_latitude",
    "has_tarification",
    "is_24_7",
]

for col in numeric_features:
    if col in X.columns:
        X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)

X = pd.get_dummies(X, drop_first=False)
X = X.reindex(columns=training_features, fill_value=0)
X = X.astype(float)


# =========================
# 6. Prédire avec les 3 modèles
# =========================

try:
    model_results = {}
    predictions = []

    # On initialise toutes les classes connues par l'encodeur.
    # Comme ça, la probabilité finale prend bien en compte les mêmes classes pour tous les modèles.
    all_classes = [str(label) for label in label_encoder.classes_]
    probability_sums = {label: 0.0 for label in all_classes}
    models_with_proba = 0

    for model_name, model in models.items():
        raw_prediction = model.predict(X)[0]
        prediction_label = decode_prediction(raw_prediction)
        probabilities = get_probabilities(model, X)

        model_results[model_name] = {
            "prediction": prediction_label
        }

        if probabilities is not None:
            model_results[model_name]["probabilities"] = probabilities
            models_with_proba += 1

            # On ajoute les probabilités du modèle pour chaque classe.
            # Si une classe n'est pas retournée par un modèle, on considère sa probabilité comme 0.
            for class_label in all_classes:
                probability_sums[class_label] += float(probabilities.get(class_label, 0))

        predictions.append(prediction_label)

    # Probabilités finales = moyenne des probabilités des modèles utilisés.
    # Ici, les modèles utilisés sont Random Forest, Gradient Boosting et XGBoost.
    if models_with_proba > 0:
        final_probabilities = {
            class_label: float(round(probability_sums[class_label] / models_with_proba, 4))
            for class_label in all_classes
        }

        # La prédiction finale est la classe avec la probabilité moyenne la plus élevée.
        final_prediction = max(final_probabilities, key=final_probabilities.get)

    else:
        # Sécurité si aucun modèle ne retourne predict_proba.
        vote_counts = Counter(predictions)
        final_prediction = vote_counts.most_common(1)[0][0]
        final_probabilities = {}

    result = {
        "success": True,
        "prediction_implantation_station": final_prediction,
        "final_prediction": final_prediction,
        "models": model_results,
        "probabilities": final_probabilities,
        "loaded_models": list(models.keys()),
        "missing_models": missing_models,
        "probability_method": "Moyenne des probabilités des modèles utilisés"
    }

    print(json.dumps(result, ensure_ascii=False))

except Exception as exc:
    print(json.dumps({
        "success": False,
        "error": "Prediction failed",
        "details": str(exc),
        "loaded_models": list(models.keys()),
        "missing_models": missing_models,
    }, ensure_ascii=False))
    sys.exit(1)
