let stations = [];
let selectedStation = null;
let map;
let markersLayer;

function getConnector(station) {
  if (Number(station.has_combo_ccs) === 1) return "CCS Combo 2";
  if (Number(station.has_type_2) === 1) return "Type 2";
  if (Number(station.has_chademo) === 1) return "CHAdeMO";
  if (Number(station.has_ef) === 1) return "EF";
  if (Number(station.has_autre) === 1) return "Autre";
  return "Non renseigné";
}

function initMap() {
  map = L.map("leafletMap").setView([46.6, 2.5], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function loadStationsOnMap(data) {
  markersLayer.clearLayers();

  data.forEach(station => {
    const lat = Number(station.consolidated_latitude);
    const lon = Number(station.consolidated_longitude);

    if (isNaN(lat) || isNaN(lon)) return;

    const marker = L.marker([lat, lon]).addTo(markersLayer);

    marker.bindPopup(`
      <strong>${station.nom_station}</strong><br>
      Département : ${station.nom_departement} (${station.code_departement})<br>
      Connecteur : ${getConnector(station)}<br>
      Puissance max : ${station.puissance_max ?? "N/A"} kW<br>
      Nbre_pdc : ${station.nbre_pdc}<br>
      Accès : ${station.condition_acces}
    `);

    marker.on("click", () => {
      selectedStation = station;
      renderStationList(data);
    });
  });
}

function renderStationList(data) {
  const stationList = document.getElementById("stationList");
  const resultCount = document.getElementById("resultCount");

  stationList.innerHTML = "";
  resultCount.textContent = `${data.length} résultats`;

  if (data.length === 0) {
    stationList.innerHTML = `
      <p class="panel-note">Aucune station trouvée.</p>
    `;
    return;
  }

  const tableWrapper = document.createElement("div");
  tableWrapper.className = "station-table-wrapper";

  tableWrapper.innerHTML = `
    <table class="station-table">
      <thead>
        <tr>
          <th></th>
          <th>Station</th>
          <th>Département</th>
          <th>Connecteur</th>
          <th>Puissance</th>
          <th>Nbre_pdc</th>
          <th>Accès</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  const tbody = tableWrapper.querySelector("tbody");

  data.forEach(station => {
    const isSelected =
      selectedStation && String(selectedStation.id_station) === String(station.id_station);

    const tr = document.createElement("tr");
    tr.className = isSelected ? "selected-row" : "";

    tr.innerHTML = `
      <td>
        <input type="radio" name="stationChoice" ${isSelected ? "checked" : ""}>
      </td>
      <td>
        <strong>${station.nom_station}</strong>
        <small>${station.adresse_station}</small>
      </td>
      <td>${station.nom_departement} (${station.code_departement})</td>
      <td><span class="table-badge">${getConnector(station)}</span></td>
      <td>${station.puissance_max ?? "N/A"} kW</td>
      <td>${station.nbre_pdc}</td>
      <td>${station.condition_acces}</td>
    `;

    tr.addEventListener("click", () => {
      selectedStation = station;
      renderStationList(data);

      const lat = Number(station.consolidated_latitude);
      const lon = Number(station.consolidated_longitude);

      if (!isNaN(lat) && !isNaN(lon)) {
        map.setView([lat, lon], 13);
      }
    });

    tbody.appendChild(tr);
  });

  stationList.appendChild(tableWrapper);
}

function applyFilters() {
  const searchValue = document.getElementById("searchInput").value.toLowerCase();
  const deptValue = document.getElementById("deptFilter").value;
  const connectorValue = document.getElementById("connectorFilter").value;

  const filtered = stations.filter(station => {
    const connector = getConnector(station);
    const deptLabel = `${station.nom_departement} (${station.code_departement})`;

    const matchSearch =
      station.nom_station.toLowerCase().includes(searchValue) ||
      station.adresse_station.toLowerCase().includes(searchValue) ||
      String(station.id_station).includes(searchValue);

    const matchDept =
      deptValue === "Tous" || deptValue === deptLabel;

    const matchConnector =
      connectorValue === "Tous" || connectorValue === connector;

    return matchSearch && matchDept && matchConnector;
  });

  renderStationList(filtered);
  loadStationsOnMap(filtered);
}

async function loadStationsFromDatabase() {
  try {
    const response = await fetch("php/api_stations.php");
    const data = await response.json();

    if (!data.success) {
      alert("Erreur API : " + data.error);
      return;
    }

    stations = data.stations;

    renderStationList(stations);
    loadStationsOnMap(stations);

  } catch (error) {
    console.error(error);
    alert("Erreur pendant le chargement des données MySQL.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadStationsFromDatabase();

  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("deptFilter").addEventListener("change", applyFilters);
  document.getElementById("connectorFilter").addEventListener("change", applyFilters);

  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("deptFilter").value = "Tous";
    document.getElementById("connectorFilter").value = "Tous";
    selectedStation = null;
    renderStationList(stations);
    loadStationsOnMap(stations);
  });

  document.getElementById("goCluster").addEventListener("click", () => {
    if (!selectedStation) {
      alert("Choisissez une station d'abord.");
      return;
    }

    const params = new URLSearchParams({
      lat: selectedStation.consolidated_latitude,
      lon: selectedStation.consolidated_longitude,
      name: selectedStation.nom_station || "-",
      id: selectedStation.id_station || "-",
      dept: `${selectedStation.nom_departement} (${selectedStation.code_departement})`,
      connector: getConnector(selectedStation),
      power: `${selectedStation.puissance_max ?? "N/A"} kW`,
      points: selectedStation.nbre_pdc || "-",
      access: selectedStation.condition_acces || "-"
    });

    window.location.href = `cluster.html?${params.toString()}`;
  });