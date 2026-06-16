function initMenu() {
  const menuButton = document.getElementById("menuButton");
  const mainNav = document.getElementById("mainNav");

  if (menuButton && mainNav) {
    menuButton.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value || "-";
  }
}

async function loadClusterPrediction() {
  const params = new URLSearchParams(window.location.search);

  const lat = params.get("lat");
  const lon = params.get("lon");

  const name = params.get("name") || "-";
  const id = params.get("id") || "-";
  const dept = params.get("dept") || "-";
  const connector = params.get("connector") || "-";
  const power = params.get("power") || "-";
  const points = params.get("points") || "-";
  const access = params.get("access") || "-";

  // Remplir le panneau "Station choisie"
  setText("summaryName", name);
  setText("summaryId", id);
  setText("summaryDept", dept);
  setText("summaryConnector", connector);
  setText("summaryPower", power);
  setText("summaryPoints", points);
  setText("summaryAccess", access);

  const status = document.getElementById("clusterStatus");
  const colorBadge = document.getElementById("clusterColorBadge");
  const mapFrame = document.getElementById("clusterMapFrame");

  if (!lat || !lon) {
    if (status) {
      status.textContent = "Aucune coordonnée reçue. Retournez à la page Visualisation et choisissez une station.";
    }
    return;
  }

  if (status) {
    status.textContent = "Prédiction IA en cours...";
  }

  try {
    const response = await fetch(
      `php/predict_cluster.php?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    );

    const data = await response.json();

    if (!data.success) {
      if (status) {
        status.textContent = "Erreur : " + data.error;
      }

      console.error(data);
      return;
    }

    const point = data.points[0];

    if (status) {
      status.innerHTML = `
        <strong>Résultat :</strong>
        la station appartient au <strong>cluster ${point.cluster}</strong>,
        couleur <strong>${point.color}</strong>.
      `;
    }

    if (colorBadge) {
      colorBadge.textContent = `Cluster ${point.cluster} · ${point.color}`;
      colorBadge.className = "cluster-color-badge";
    }

    if (mapFrame && data.map_url) {
      mapFrame.src = data.map_url;
    }

  } catch (error) {
    console.error(error);

    if (status) {
      status.textContent = "Erreur pendant l'appel au modèle Python.";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  loadClusterPrediction();
});