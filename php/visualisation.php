<!DOCTYPE html>
<html lang="fr">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visualisation - IRVE Data Explorer</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
</head>

<body>
  <header class="site-header">
    <div class="header-inner">
      <a class="logo" href="index.html">
        <span class="logo-icon">⚡</span>
        <span>
          <strong>IRVE Data Explorer</strong>
          <small>Infrastructures de recharge</small>
        </span>
      </a>

      <button class="menu-button" id="menuButton" type="button">☰</button>

      <nav class="nav" id="mainNav">
        <a href="index.html">Accueil</a>
        <a class="active" href="visualisation.php">Visualisation</a>
        <a href="stats.html">Statistiques</a>
      </nav>

      <span class="header-badge">FISE3 – 2026</span>
    </div>
  </header>

  <main class="container">
    <div class="page-heading">
      <h1>Visualisation</h1>
      <p>Les données sont chargées depuis MySQL avec PHP. La liste affiche seulement 6 informations principales par station.</p>
    </div>

    <section class="filter-bar">
      <input id="searchInput" type="text" placeholder="Rechercher une station ou un identifiant…">

      <select id="deptFilter">
        <option value="Tous">Tous les départements</option>
      </select>

      <select id="connectorFilter">
        <option value="Tous">Tous les connecteurs</option>
      </select>

      <button class="btn small" id="resetFilters" type="button">↻ Réinitialiser</button>
    </section>

    <section class="visualisation-layout">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Stations de recharge</h2>
            <p class="panel-note">Données réelles depuis la base MySQL.</p>
          </div>
          <span id="resultCount">Chargement...</span>
        </div>

        <div class="station-list" id="stationList">
          <p class="panel-note">Chargement des stations...</p>
        </div>

        <div class="prediction-actions">
          <button class="btn small" id="goCluster" type="button">Prédire clusters</button>
          <button class="btn small" id="goImplantation" type="button">Prédire implantation</button>
          <button class="btn small" id="goPower" type="button">Prédire puissance</button>
        </div>
      </div>

      <div class="panel map-zone">
        <div class="panel-header">
          <div>
            <h2>Carte des stations</h2>
            <p class="panel-note">Toutes les stations sont placées avec longitude et latitude.</p>
          </div>
          <span id="mapStatus">Carte</span>
        </div>

        <div id="leafletMap" class="leaflet-map"></div>

        <div class="map-legend">
          <span><span class="badge blue">●</span> Station</span>
          <span><span class="badge orange">●</span> Station sélectionnée</span>
          <span>Fond de carte : OpenStreetMap</span>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <span><strong>⚡ IRVE Data Explorer</strong></span>
      <span>Projet Big Data / IA / Web – FISE3 – 2026</span>
      <span class="footer-tags">PHP · MySQL · Leaflet</span>
    </div>
  </footer>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    let allStations = [];
    let filteredStations = [];
    let selectedStation = null;
    let map = null;
    let markerLayer = null;

    const stationList = document.getElementById("stationList");
    const resultCount = document.getElementById("resultCount");
    const searchInput = document.getElementById("searchInput");
    const deptFilter = document.getElementById("deptFilter");
    const connectorFilter = document.getElementById("connectorFilter");
    const resetFilters = document.getElementById("resetFilters");
    const goCluster = document.getElementById("goCluster");
    const goImplantation = document.getElementById("goImplantation");
    const goPower = document.getElementById("goPower");
    const mapStatus = document.getElementById("mapStatus");

    function initMap() {
      map = L.map("leafletMap").setView([46.6, 2.4], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
      }).addTo(map);

      markerLayer = L.layerGroup().addTo(map);
    }

    function createOption(value, label) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    }

    function fillFilters() {
      const departments = [...new Set(allStations.map(s => s.departement))].sort();
      const connectors = [...new Set(allStations.map(s => s.connecteur))].sort();

      deptFilter.innerHTML = "";
      deptFilter.appendChild(createOption("Tous", "Tous les départements"));
      departments.forEach(dep => deptFilter.appendChild(createOption(dep, dep)));

      connectorFilter.innerHTML = "";
      connectorFilter.appendChild(createOption("Tous", "Tous les connecteurs"));
      connectors.forEach(conn => connectorFilter.appendChild(createOption(conn, conn)));
    }

    function applyFilters() {
      const search = searchInput.value.trim().toLowerCase();
      const dep = deptFilter.value;
      const connector = connectorFilter.value;

      filteredStations = allStations.filter(station => {
        const text = `${station.id_station} ${station.nom_station} ${station.departement}`.toLowerCase();
        const matchSearch = !search || text.includes(search);
        const matchDep = dep === "Tous" || station.departement === dep;
        const matchConnector = connector === "Tous" || station.connecteur === connector;
        return matchSearch && matchDep && matchConnector;
      });

      renderList();
      renderMap();
    }

    function renderList() {
      resultCount.textContent = `${filteredStations.length} résultats`;
      stationList.innerHTML = "";

      if (filteredStations.length === 0) {
        stationList.innerHTML = '<p class="panel-note">Aucune station trouvée.</p>';
        return;
      }

      filteredStations.forEach(station => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "station-card";
        item.style.textAlign = "left";
        item.style.width = "100%";
        item.style.marginBottom = "10px";
        item.style.cursor = "pointer";

        if (selectedStation && selectedStation.id_station === station.id_station) {
          item.classList.add("selected");
          item.style.border = "2px solid #f97316";
        }

        const puissance = station.puissance !== null ? `${station.puissance} kW` : "N/A";

        item.innerHTML = `
          <strong>${station.nom_station}</strong>
          <small>ID station : ${station.id_station}</small>
          <div class="station-summary">
            <p><span>Département</span><strong>${station.departement}</strong></p>
            <p><span>Connecteur</span><strong>${station.connecteur}</strong></p>
            <p><span>Puissance</span><strong>${puissance}</strong></p>
            <p><span>Points</span><strong>${station.nbre_pdc}</strong></p>
            <p><span>Accès</span><strong>${station.acces}</strong></p>
            <p><span>Implantation</span><strong>${station.implantation}</strong></p>
          </div>
        `;

        item.addEventListener("click", () => {
          selectedStation = station;
          renderList();
          renderMap();
        });

        stationList.appendChild(item);
      });
    }

    function renderMap() {
      markerLayer.clearLayers();

      if (filteredStations.length === 0) {
        mapStatus.textContent = "0 station";
        return;
      }

      const bounds = [];

      filteredStations.forEach(station => {
        const lat = Number(station.latitude);
        const lon = Number(station.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lon)) return;

        const isSelected = selectedStation && selectedStation.id_station === station.id_station;
        const color = isSelected ? "#f97316" : "#2563eb";

        const marker = L.circleMarker([lat, lon], {
          radius: isSelected ? 9 : 6,
          color: color,
          fillColor: color,
          fillOpacity: 0.85
        }).addTo(markerLayer);

        marker.bindPopup(`
          <strong>${station.nom_station}</strong><br>
          Département : ${station.departement}<br>
          Connecteur : ${station.connecteur}<br>
          Puissance : ${station.puissance ?? "N/A"} kW<br>
          PDC : ${station.nbre_pdc}<br>
          Accès : ${station.acces}
        `);

        marker.on("click", () => {
          selectedStation = station;
          renderList();
          renderMap();
        });

        bounds.push([lat, lon]);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [25, 25] });
      }

      mapStatus.textContent = `${filteredStations.length} station(s)`;
    }

    async function loadStationsFromDatabase() {
      try {
        const response = await fetch("api_stations.php");
        const data = await response.json();

        if (!data.success) {
          stationList.innerHTML = `<p class="panel-note">Erreur : ${data.error}</p>`;
          resultCount.textContent = "Erreur";
          return;
        }

        allStations = data.stations;
        filteredStations = [...allStations];

        fillFilters();
        renderList();
        renderMap();
      } catch (error) {
        stationList.innerHTML = '<p class="panel-note">Erreur pendant le chargement PHP/MySQL.</p>';
        resultCount.textContent = "Erreur";
        console.error(error);
      }
    }

    searchInput.addEventListener("input", applyFilters);
    deptFilter.addEventListener("change", applyFilters);
    connectorFilter.addEventListener("change", applyFilters);

    resetFilters.addEventListener("click", () => {
      searchInput.value = "";
      deptFilter.value = "Tous";
      connectorFilter.value = "Tous";
      selectedStation = null;
      applyFilters();
    });

    goCluster.addEventListener("click", () => {
      if (!selectedStation) {
        alert("Choisissez d'abord une station.");
        return;
      }
      window.location.href = `cluster.html?lat=${selectedStation.latitude}&lon=${selectedStation.longitude}`;
    });

    goImplantation.addEventListener("click", () => {
      alert("À connecter plus tard avec le modèle IA d'implantation.");
    });

    goPower.addEventListener("click", () => {
      alert("À connecter plus tard avec le modèle IA de puissance.");
    });

    document.getElementById("menuButton")?.addEventListener("click", () => {
      document.getElementById("mainNav")?.classList.toggle("open");
    });

    initMap();
    loadStationsFromDatabase();
  </script>
</body>

</html>
