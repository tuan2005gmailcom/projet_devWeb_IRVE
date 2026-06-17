import sys
import json
import joblib
import pandas as pd
import numpy as np

# 1. Charger le modèle

MODEL_PATH = "random_forest_puissance.pkl"
CONFIG_PATH = "model_config.pkl"

model = joblib.load(MODEL_PATH)
config = joblib.load(CONFIG_PATH)

features = config["features"]
numeric_cols = config["numeric_cols"]

# 2. Fonctions de nettoyage


def convert_bool_to_01(x):
    if pd.isna(x):
        return np.nan

    x = str(x).strip().lower()

    if x in ["true", "1", "yes", "oui"]:
        return 1
    elif x in ["false", "0", "no", "non"]:
        return 0
    else:
        return np.nan


def prepare_input(data):
    """
    data = demande client reçue depuis le site web
    """

    df = pd.DataFrame([data])

    # Harmoniser condition_acces
    if "condition_acces" in df.columns:
        df["condition_acces"] = (
            df["condition_acces"]
            .astype("string")
            .str.strip()
            .replace(
                {
                    "AccĂ¨s libre": "Accès libre",
                    "Acc¸s libre": "Accès libre",
                    "Accs libre": "Accès libre",
                    "Accès libre": "Accès libre",
                    "Accès réservé": "Accès réservé",
                }
            )
        )

    # Harmoniser implantation_station
    if "implantation_station" in df.columns:
        df["implantation_station"] = (
            df["implantation_station"]
            .astype("string")
            .str.strip()
            .replace(
                {
                    "Parking priv  usage public": "Parking privé à usage public",
                    "Parking priv rserv  la clientle": "Parking privé réservé à la clientèle",
                }
            )
        )

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

    # Créer is_24_7 à partir de horaires
    if "horaires" in df.columns:
        horaires_clean = df["horaires"].astype("string").str.lower().str.strip()

        df["is_24_7"] = horaires_clean.str.contains(
            r"24/7|00:00-24:00|00:00-23:59|mo-su 00:00", regex=True, na=False
        ).astype(int)
    else:
        df["is_24_7"] = np.nan

    # Créer has_tarification à partir de tarification et gratuit

    # 1. Nettoyer gratuit
    if "gratuit" in df.columns:
        df["gratuit_num"] = (
            df["gratuit"]
            .astype("string")
            .str.lower()
            .str.strip()
            .map({"true": 1, "false": 0, "1": 1, "0": 0})
        )
    else:
        df["gratuit_num"] = np.nan

    # 2. Nettoyer tarification
    if "tarification" in df.columns:
        tarif_clean = df["tarification"].astype("string").str.strip()

        tarif_present = (
            tarif_clean.notna()
            & (tarif_clean != "")
            & (~tarif_clean.str.lower().isin(["nan", "none", "null", "non renseigné"]))
        )
    else:
        tarif_present = pd.Series([False], index=df.index)

    # 3. Information tarifaire disponible
    # 1 si une tarification est indiquée
    # OU si la borne n'est pas gratuite
    df["has_tarification"] = (tarif_present | (df["gratuit_num"] == 0)).astype(int)

    # Créer nb_types_prises
    prise_cols = [
        "prise_type_ef",
        "prise_type_2",
        "prise_type_combo_ccs",
        "prise_type_chademo",
        "prise_type_autre",
    ]

    for col in prise_cols:
        if col not in df.columns:
            df[col] = np.nan

    df["nb_types_prises"] = df[prise_cols].sum(axis=1)

    # Ajouter les colonnes manquantes attendues par le modèle
    for col in features:
        if col not in df.columns:
            df[col] = np.nan

    # Garder seulement les colonnes utilisées par le modèle
    X_input = df[features].copy()

    # Convertir les colonnes numériques
    for col in numeric_cols:
        if col in X_input.columns:
            X_input[col] = pd.to_numeric(X_input[col], errors="coerce")

    return X_input


# 3. Lire JSON depuis terminal

try:
    raw_input = sys.stdin.read().strip()

    if not raw_input:
        raise ValueError("Aucun JSON reçu.")

    client_request = json.loads(raw_input)

except Exception as e:
    print(
        json.dumps(
            {"success": False, "error": "Invalid JSON input", "details": str(e)},
            ensure_ascii=False,
        )
    )
    sys.exit(1)


# 4. Prédire

try:
    X_input = prepare_input(client_request)

    prediction = model.predict(X_input)[0]

    print(
        json.dumps(
            {
                "success": True,
                "predicted_puissance_nominale": round(float(prediction), 2),
                "unit": "kW",
            },
            ensure_ascii=False,
        )
    )

except Exception as e:
    print(
        json.dumps(
            {"success": False, "error": "Prediction failed", "details": str(e)},
            ensure_ascii=False,
        )
    )
    sys.exit(1)
