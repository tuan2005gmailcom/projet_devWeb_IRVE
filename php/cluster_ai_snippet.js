// Ce script appelle predict_cluster.php
// predict_cluster.php appelle Python
// Python utilise cluster_model.pkl + scaler.pkl

async function loadClusterPrediction() {
  const params = new URLSearchParams(window.location.search);

  const lat = params.get("lat");
  const lon = params.get("lon");

  const status = document.getElementById("clusterStatus");
  const dbscanResult = document.getElementById("dbscanResult");
  const dbscanComment = document.getElementById("dbscanComment");
  const kmeansResult = document.getElementById("kmeansResult");
  const kmeansComment = document.getElementById("kmeansComment");

  if (!lat || !lon) {
    if (status) {
      status.textContent =
        "Aucune coordonnée reçue. Exemple : cluster.html?lat=48.8566&lon=2.3522";
    }
    return;
  }

  try {
    const response = await fetch(
      `predict_cluster.php?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    );

    const data = await response.json();

    if (!data.success) {
      if (status) {
        status.textContent = "Erreur : " + data.error;
      }
      return;
    }

    const point = data.points[0];

    if (dbscanResult) {
      dbscanResult.textContent = `Cluster ${point.cluster}`;
    }

    if (dbscanComment) {
      dbscanComment.textContent = `Couleur associée : ${point.color}`;
    }

    if (kmeansResult) {
      kmeansResult.textContent = `Groupe ${point.cluster}`;
    }

    if (kmeansComment) {
      kmeansComment.textContent =
        `Coordonnées : ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
    }

    if (status) {
      status.textContent = "Prédiction IA terminée avec succès.";
    }

  } catch (error) {
    if (status) {
      status.textContent = "Erreur pendant l'appel au modèle IA.";
    }

    console.error(error);
  }
}

loadClusterPrediction();