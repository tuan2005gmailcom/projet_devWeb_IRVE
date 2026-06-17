import sys
import json
import joblib
import pandas as pd
from pathlib import Path

# 1. Charger les modèles

BASE_DIR = Path(__file__).resolve().parent

MODEL_FILE = BASE_DIR / "model_implantation.pkl"
ENCODER_FILE = BASE_DIR / "label_encoder_implantation.pkl"
FEATURES_FILE = BASE_DIR / "features_implantation.pkl"

model = joblib.load(MODEL_FILE)
label_encoder = joblib.load(ENCODER_FILE)
training_features = joblib.load(FEATURES_FILE)


# 2. Fonctions utiles


def bool_to_int(value):
    """
    Convertit les valeurs venant du formulaire en 0/1.
    Accepte : true/false, oui/non, 1/0, yes/no.
    """
    value = str(value).lower().strip()

    if value in ["true", "1", "oui", "yes", "y"]:
        return 1
    elif value in ["false", "0", "non", "no", "n"]:
        return 0
    else:
        return 0


def clean_condition_acces(value):
    value = str(value).strip().lower()

    if "libre" in value:
        return "Accès libre"
    elif "réserv" in value or "reserv" in value:
        return "Accès réservé"
    else:
        return "unknown"


def is_open_24_7(value):
    value = str(value).lower().strip()

    patterns = ["24/7", "00:00-24:00", "00:00-23:59"]

    return int(any(p in value for p in patterns))


# 3. Lire la demande client
# Le site Web doit envoyer un JSON au script Python.

try:
    input_data = json.loads(sys.stdin.read())
except Exception:
    print(
        json.dumps(
            {"success": False, "error": "Invalid JSON input"}, ensure_ascii=False
        )
    )
    sys.exit(1)


# 4. Construire une ligne de données

gratuit_value = bool_to_int(input_data.get("gratuit", 0))

tarification_value = input_data.get("tarification", "")
has_tarification = int(
    tarification_value is not None
    and str(tarification_value).strip() != ""
    or gratuit_value == 0
)

row = {
    "nbre_pdc": input_data.get("nbre_pdc", 0),
    "puissance_nominale": input_data.get("puissance_nominale", 0),
    "consolidated_longitude": input_data.get("consolidated_longitude", 0),
    "consolidated_latitude": input_data.get("consolidated_latitude", 0),
    "prise_type_ef": bool_to_int(input_data.get("prise_type_ef", 0)),
    "prise_type_2": bool_to_int(input_data.get("prise_type_2", 0)),
    "prise_type_combo_ccs": bool_to_int(input_data.get("prise_type_combo_ccs", 0)),
    "prise_type_chademo": bool_to_int(input_data.get("prise_type_chademo", 0)),
    "prise_type_autre": bool_to_int(input_data.get("prise_type_autre", 0)),
    "gratuit": gratuit_value,
    "station_deux_roues": bool_to_int(input_data.get("station_deux_roues", 0)),
    "condition_acces": clean_condition_acces(
        input_data.get("condition_acces", "unknown")
    ),
    "has_tarification": has_tarification,
    "is_24_7": is_open_24_7(input_data.get("horaires", "")),
}

X = pd.DataFrame([row])


# 5. Prétraitement identique au notebook

numeric_features = [
    "nbre_pdc",
    "puissance_nominale",
    "consolidated_longitude",
    "consolidated_latitude",
    "has_tarification",
    "is_24_7",
]

for col in numeric_features:
    X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)

# Encoder les variables catégorielles
X = pd.get_dummies(X, drop_first=False)

# Remettre les mêmes colonnes que pendant l'entraînement
X = X.reindex(columns=training_features, fill_value=0)

# Forcer le format numérique
X = X.astype(float)


# 6. Prédiction

prediction_encoded = model.predict(X)[0]
prediction_label = label_encoder.inverse_transform([prediction_encoded])[0]

result = {"success": True, "prediction_implantation_station": prediction_label}

# Optionnel : probabilité si le modèle le permet
if hasattr(model, "predict_proba"):
    probabilities = model.predict_proba(X)[0]
    result["probabilities"] = {
        label: float(round(prob, 4))
        for label, prob in zip(label_encoder.classes_, probabilities)
    }

print(json.dumps(result, ensure_ascii=False))
