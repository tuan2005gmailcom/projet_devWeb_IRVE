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

function getMarkerColor(colorName) {
  const colors = {
    red: "#ef4444",
    blue: "#2563eb",
    green: "#22c55e",
    purple: "#8b5cf6",
    orange: "#f97316",
    darkred: "#991b1b",
    darkblue: "#1e3a8a",
    darkgreen: "#166534",
    gray: "#64748b",
    black: "#111827",
    pink: "#ec4899"
  };

  return colors[colorName] || "#2563eb";
}

function renderClusterMap(point, stationName) {
  const mapElement = document.getElementById("clusterLeafletMap");

  if (!mapElement) {
    console.error("Div clusterLeafletMap introuvable dans cluster.html.");
    return;
  }

  const lat = Number(point.latitude);
  const lon = Number(point.longitude);

  const map = L.map("clusterLeafletMap").setView([lat, lon], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  const markerColor = getMarkerColor(point.color);

  const marker = L.circleMarker([lat, lon], {
    radius: 12,
    color: markerColor,
    fillColor: markerColor,
    fillOpacity: 0.85
  }).addTo(map);

  marker.bindPopup(`
    <strong>${stationName}</strong><br>
    Cluster : ${point.cluster}<br>
    Couleur : ${point.color}<br>
    Latitude : ${lat.toFixed(6)}<br>
    Longitude : ${lon.toFixed(6)}
  `).openPopup();
}

async function loadClusterPrediction() {
  const params = new URLSearchParams(window.location.search);

  const lat = params.get("lat");
  const lon = params.get("lon");
  const name = params.get("name") || "-";

  setText("summaryName", name);
  setText("summaryId", params.get("id"));
  setText("summaryDept", params.get("dept"));
  setText("summaryConnector", params.get("connector"));
  setText("summaryPoints", params.get("points"));
  setText("summaryAccess", params.get("access"));
  setText("summaryLat", lat);
  setText("summaryLon", lon);

  const status = document.getElementById("clusterStatus");
  const colorBadge = document.getElementById("clusterColorBadge");
  const clusterNumber = document.getElementById("clusterNumber");

  if (!lat || !lon) {
    if (status) {
      status.textContent = "Aucune coordonnée reçue. Retournez à la page Visualisation et choisissez une station.";
    }
    return;
  }

  try {
    if (status) {
      status.textContent = "Prédiction IA en cours...";
    }

    const response = await fetch(
      `php/predict_cluster.php?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    );

    const text = await response.text();
    console.log("Réponse brute predict_cluster.php :", text);

    const data = JSON.parse(text);

    if (!data.success) {
      if (status) {
        status.textContent = "Erreur : " + data.error;
      }
      console.error(data);
      return;
    }

    const point = data.points[0];

    if (clusterNumber) {
      clusterNumber.textContent = `Cluster ${point.cluster}`;
    }

    if (colorBadge) {
      colorBadge.textContent = `Cluster ${point.cluster} · ${point.color}`;
      colorBadge.className = "cluster-color-badge";
    }

    if (status) {
      status.innerHTML = `
        <strong>Résultat :</strong>
        la station appartient au <strong>cluster ${point.cluster}</strong>,
        couleur <strong>${point.color}</strong>.
      `;
    }

    renderClusterMap(point, name);

  } catch (error) {
    console.error(error);

    if (status) {
      status.textContent = "Erreur pendant l'appel au modèle Python. Regarde F12 > Console.";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  loadClusterPrediction();
});