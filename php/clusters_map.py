# -*- coding: utf-8 -*-
"""
Predict clusters for one or several GPS coordinates and save a Folium map.

Examples:
    python clusters_map.py --lat 48.8566 --lon 2.3522
    python clusters_map.py --coord 48.8566 2.3522 --coord 45.7640 4.8357
    python clusters_map.py --coords "48.8566,2.3522;45.7640,4.8357;43.2965,5.3698"
    python clusters_map.py --input coordinates.csv --output carte_clusters.html

CSV input must contain either:
    - columns: latitude, longitude
    - or columns: lat, lon
    - or columns: consolidated_latitude, consolidated_longitude
"""

import argparse
from pathlib import Path

import joblib
import pandas as pd

try:
    import folium
except ImportError as exc:
    raise SystemExit(
        "[ERROR] folium is not installed. Install it with: pip install folium"
    ) from exc


BASE_DIR = Path(__file__).resolve().parent
MODEL_FILE = BASE_DIR / "cluster_model.pkl"
SCALER_FILE = BASE_DIR / "scaler.pkl"

COLORS = [
    "red", "blue", "green", "purple", "orange", "darkred", "lightred", "beige",
    "darkblue", "darkgreen", "cadetblue", "pink", "lightblue", "lightgreen",
    "gray", "black", "lightgray"
]


def load_model_and_scaler():
    """Load the trained clustering model and scaler from the script folder."""
    if not MODEL_FILE.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_FILE}")
    if not SCALER_FILE.exists():
        raise FileNotFoundError(f"Scaler file not found: {SCALER_FILE}")

    model = joblib.load(MODEL_FILE)
    scaler = joblib.load(SCALER_FILE)
    return model, scaler


def predict_clusters(coordinates_df):
    """Predict cluster and color for every coordinate."""
    model, scaler = load_model_and_scaler()

    X_new = coordinates_df[["consolidated_latitude", "consolidated_longitude"]]
    X_scaled = scaler.transform(X_new)
    clusters = model.predict(X_scaled)

    result = coordinates_df.copy()
    result["cluster"] = clusters.astype(int)
    result["color"] = result["cluster"].apply(lambda c: COLORS[c % len(COLORS)])
    return result


def normalize_input_dataframe(df):
    """Rename possible latitude/longitude columns to the expected model columns."""
    df = df.copy()

    possible_names = {
        "latitude": "consolidated_latitude",
        "lat": "consolidated_latitude",
        "longitude": "consolidated_longitude",
        "lon": "consolidated_longitude",
        "lng": "consolidated_longitude",
    }
    df = df.rename(columns={col: possible_names.get(col, col) for col in df.columns})

    required_cols = ["consolidated_latitude", "consolidated_longitude"]
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        raise ValueError(
            "Input must contain latitude and longitude columns. "
            "Accepted names: latitude/longitude, lat/lon, or "
            "consolidated_latitude/consolidated_longitude. "
            f"Missing: {missing}"
        )

    df = df[required_cols]
    df = df.dropna()
    df["consolidated_latitude"] = pd.to_numeric(df["consolidated_latitude"], errors="coerce")
    df["consolidated_longitude"] = pd.to_numeric(df["consolidated_longitude"], errors="coerce")
    df = df.dropna().reset_index(drop=True)

    if df.empty:
        raise ValueError("No valid coordinates found after cleaning missing/invalid values.")

    return df


def parse_coordinates(args):
    """Read coordinates from --lat/--lon, repeated --coord, --coords string, or CSV file."""
    rows = []

    if args.lat is not None or args.lon is not None:
        if args.lat is None or args.lon is None:
            raise ValueError("Use both --lat and --lon together.")
        rows.append({"consolidated_latitude": args.lat, "consolidated_longitude": args.lon})

    if args.coord:
        for lat, lon in args.coord:
            rows.append({"consolidated_latitude": lat, "consolidated_longitude": lon})

    if args.coords:
        # Format: "lat,lon;lat,lon;lat,lon"
        for item in args.coords.split(";"):
            item = item.strip()
            if not item:
                continue
            try:
                lat_str, lon_str = item.split(",")
                rows.append({
                    "consolidated_latitude": float(lat_str.strip()),
                    "consolidated_longitude": float(lon_str.strip()),
                })
            except ValueError as exc:
                raise ValueError(
                    "Invalid --coords format. Use: \"lat,lon;lat,lon\""
                ) from exc

    if args.input:
        input_path = Path(args.input)
        if not input_path.exists():
            raise FileNotFoundError(f"Input CSV not found: {input_path}")
        df_file = pd.read_csv(input_path)
        df_file = normalize_input_dataframe(df_file)
        rows.extend(df_file.to_dict(orient="records"))

    if not rows:
        raise ValueError(
            "No coordinates provided. Use --lat/--lon, --coord, --coords, or --input."
        )

    return normalize_input_dataframe(pd.DataFrame(rows))


def create_cluster_map(result_df, output_html):
    """Create and save a map with one colored marker per coordinate."""
    center_lat = result_df["consolidated_latitude"].mean()
    center_lon = result_df["consolidated_longitude"].mean()

    m = folium.Map(location=[center_lat, center_lon], zoom_start=6, tiles="OpenStreetMap")

    for i, row in result_df.iterrows():
        lat = row["consolidated_latitude"]
        lon = row["consolidated_longitude"]
        cluster = int(row["cluster"])
        color = row["color"]

        popup_text = (
            f"<b>Point {i + 1}</b><br>"
            f"Latitude: {lat:.6f}<br>"
            f"Longitude: {lon:.6f}<br>"
            f"Cluster: {cluster}<br>"
            f"Color: {color}"
        )

        folium.Marker(
            location=[lat, lon],
            popup=folium.Popup(popup_text, max_width=250),
            tooltip=f"Cluster {cluster}",
            icon=folium.Icon(color=color, icon="bolt", prefix="fa"),
        ).add_to(m)

        # Small colored circle makes the cluster color easy to see on the map.
        folium.CircleMarker(
            location=[lat, lon],
            radius=7,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.7,
        ).add_to(m)

    output_path = Path(output_html)
    m.save(output_path)
    return output_path


def print_results(result_df, output_path):
    print("\n[INFO] Analyse des positions")
    print("-" * 70)
    for i, row in result_df.iterrows():
        print(f"Point {i + 1}")
        print(f"  Latitude  : {row['consolidated_latitude']:.6f}")
        print(f"  Longitude : {row['consolidated_longitude']:.6f}")
        print(f"  Cluster   : {int(row['cluster'])}")
        print(f"  Couleur   : {row['color']}")
        print("-" * 70)
    print(f"Carte HTML sauvegardée : {output_path}")
    print("Prédiction terminée")


def main():
    parser = argparse.ArgumentParser(
        description="Prédire le cluster d'une ou plusieurs bornes et créer une carte HTML."
    )

    # Old single-coordinate format, kept for compatibility.
    parser.add_argument("--lat", type=float, help="Latitude d'un seul point")
    parser.add_argument("--lon", type=float, help="Longitude d'un seul point")

    # New multiple-coordinate options.
    parser.add_argument(
        "--coord",
        type=float,
        nargs=2,
        action="append",
        metavar=("LAT", "LON"),
        help="Ajouter un point. Peut être répété plusieurs fois. Exemple: --coord 48.8566 2.3522 --coord 45.7640 4.8357",
    )
    parser.add_argument(
        "--coords",
        type=str,
        help='Liste de coordonnées. Format: "lat,lon;lat,lon;lat,lon"',
    )
    parser.add_argument(
        "--input",
        type=str,
        help="CSV contenant latitude/longitude, lat/lon, ou consolidated_latitude/consolidated_longitude",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="cluster_map.html",
        help="Nom du fichier HTML de sortie. Défaut: cluster_map.html",
    )

    args = parser.parse_args()

    coordinates_df = parse_coordinates(args)
    result_df = predict_clusters(coordinates_df)
    output_path = create_cluster_map(result_df, args.output)
    print_results(result_df, output_path)


if __name__ == "__main__":
    main()
