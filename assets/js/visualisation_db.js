let stations = [];
let selectedStation = null;
let map;
let markersLayer;

function getConnectors(station) {
  const connectors = [];

  if (Number(station.has_combo_ccs) === 1) connectors.push("CCS Combo 2");
  if (Number(station.has_type_2) === 1) connectors.push("Type 2");
  if (Number(station.has_chademo) === 1) connectors.push("CHAdeMO");
  if (Number(station.has_ef) === 1) connectors.push("EF");
  if (Number(station.has_autre) === 1) connectors.push("Autre");

  return connectors.length > 0 ? connectors : ["Non renseigné"];
}

function getConnectorText(station) {
  return getConnectors(station).join(", ");
}

function getDeptLabel(station) {
  return `${station.nom_departement} (${station.code_departement})`;
}

function fillFiltersFromDatabase() {
  const deptFilter = document.getElementById("deptFilter");
  const connectorFilter = document.getElementById("connectorFilter");

  const departments = [...new Set(stations.map(getDeptLabel))].sort();

  const connectors = [
    ...new Set(
      stations.flatMap(station => getConnectors(station))
    )
  ].sort();

  deptFilter.innerHTML = `<option value="Tous">Tous les départements</option>`;
  departments.forEach(dept => {
    const option = document.createElement("option");
    option.value = dept;
    option.textContent = dept;
    deptFilter.appendChild(option);
  });

  connectorFilter.innerHTML = `<option value="Tous">Tous les connecteurs</option>`;
  connectors.forEach(connector => {
    const option = document.createElement("option");
    option.value = connector;
    option.textContent = connector;
    connectorFilter.appendChild(option);
  });
}

function initMenu() {
  const menuButton = document.getElementById("menuButton");
  const mainNav = document.getElementById("mainNav");

  if (menuButton && mainNav) {
    menuButton.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });
  }
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

  const bounds = [];

  data.forEach(station => {
    const lat = Number(station.consolidated_latitude);
    const lon = Number(station.consolidated_longitude);

    if (isNaN(lat) || isNaN(lon)) return;

    const isSelected =
      selectedStation && String(selectedStation.id_station) === String(station.id_station);

    const color = isSelected ? "#f97316" : "#2563eb";

    const marker = L.circleMarker([lat, lon], {
      radius: isSelected ? 9 : 6,
      color: color,
      fillColor: color,
      fillOpacity: 0.85
    }).addTo(markersLayer);

    marker.bindPopup(`
      <strong>${station.nom_station}</strong><br>
      Département : ${getDeptLabel(station)}<br>
      Connecteur : ${getConnectorText(station)}<br>
      Puissance max : ${station.puissance_max ?? "N/A"} kW<br>
      Nbre_pdc : ${station.nbre_pdc}<br>
      Accès : ${station.condition_acces}
    `);

    marker.on("click", () => {
      selectedStation = station;
      renderStationList(data);
      loadStationsOnMap(data);
    });

    bounds.push([lat, lon]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [25, 25] });
  }
}

function renderStationList(data) {
  const stationList = document.getElementById("stationList");
  const resultCount = document.getElementById("resultCount");

  stationList.innerHTML = "";
  resultCount.textContent = `${data.length} résultats`;

  if (data.length === 0) {
    stationList.innerHTML = `<p class="panel-note">Aucune station trouvée.</p>`;
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
        <strong>${station.nom_station || "-"}</strong>
        <small>${station.adresse_station || "-"}</small>
      </td>
      <td>${getDeptLabel(station)}</td>
      <td><span class="table-badge">${getConnectorText(station)}</span></td>
      <td>${station.puissance_max ?? "N/A"} kW</td>
      <td>${station.nbre_pdc ?? "-"}</td>
      <td>${station.condition_acces || "-"}</td>
    `;

    tr.addEventListener("click", () => {
      selectedStation = station;
      renderStationList(data);
      loadStationsOnMap(data);

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
    const connectors = getConnectors(station);
    const deptLabel = getDeptLabel(station);

    const matchSearch =
      String(station.nom_station || "").toLowerCase().includes(searchValue) ||
      String(station.adresse_station || "").toLowerCase().includes(searchValue) ||
      String(station.id_station || "").includes(searchValue);

    const matchDept =
      deptValue === "Tous" || deptValue === deptLabel;

    const matchConnector =
      connectorValue === "Tous" || connectors.includes(connectorValue);

    return matchSearch && matchDept && matchConnector;
  });

  renderStationList(filtered);
  loadStationsOnMap(filtered);
}

async function loadStationsFromDatabase() {
  const stationList = document.getElementById("stationList");
  const resultCount = document.getElementById("resultCount");

  try {
    stationList.innerHTML = `<p class="panel-note">Chargement des stations...</p>`;
    resultCount.textContent = "Chargement...";

    const response = await fetch("php/api_stations.php");
    const text = await response.text();

    console.log("Réponse API :", text);

    const data = JSON.parse(text);

    if (!data.success) {
      stationList.innerHTML = `<p class="panel-note">Erreur API : ${data.error}</p>`;
      resultCount.textContent = "Erreur";
      return;
    }

    stations = data.stations;

    fillFiltersFromDatabase();
    renderStationList(stations);
    loadStationsOnMap(stations);

  } catch (error) {
    console.error(error);
    stationList.innerHTML = `<p class="panel-note">Erreur pendant le chargement des données MySQL. Regarde F12 > Console.</p>`;
    resultCount.textContent = "Erreur";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
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
    map.setView([46.6, 2.5], 6);
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
      dept: getDeptLabel(selectedStation),
      connector: getConnectorText(selectedStation),
      power: `${selectedStation.puissance_max ?? "N/A"} kW`,
      points: selectedStation.nbre_pdc || "-",
      access: selectedStation.condition_acces || "-"
    });

    window.location.href = `cluster.html?${params.toString()}`;
  });

  document.getElementById("goImplantation").addEventListener("click", () => {
    if (!selectedStation) {
      alert("Choisissez une station d'abord.");
      return;
    }

    const params = new URLSearchParams({
      type: "implantation",

      name: selectedStation.nom_station || "-",
      id: selectedStation.id_station || "-",
      dept: getDeptLabel(selectedStation),
      connector: getConnectorText(selectedStation),
      power: `${selectedStation.puissance_max ?? "N/A"} kW`,
      points: selectedStation.nbre_pdc || "-",
      access: selectedStation.condition_acces || "-",

      lat: selectedStation.consolidated_latitude || 0,
      lon: selectedStation.consolidated_longitude || 0,

      nbre_pdc: selectedStation.nbre_pdc || 0,
      puissance_nominale: selectedStation.puissance_max || 0,

      consolidated_latitude: selectedStation.consolidated_latitude || 0,
      consolidated_longitude: selectedStation.consolidated_longitude || 0,

      prise_type_ef: selectedStation.has_ef || 0,
      prise_type_2: selectedStation.has_type_2 || 0,
      prise_type_combo_ccs: selectedStation.has_combo_ccs || 0,
      prise_type_chademo: selectedStation.has_chademo || 0,
      prise_type_autre: selectedStation.has_autre || 0,

      gratuit: selectedStation.gratuit ?? selectedStation.is_gratuit ?? 0,
      station_deux_roues: selectedStation.station_deux_roues || 0,
      condition_acces: selectedStation.condition_acces || "unknown",
      tarification: selectedStation.tarification || "",
      horaires: selectedStation.horaires || ""
    });

    window.location.href = `implantation.html?${params.toString()}`;
  });

  document.getElementById("goPower").addEventListener("click", () => {
    if (!selectedStation) {
      alert("Choisissez une station d'abord.");
      return;
    }

    const params = new URLSearchParams({
      type: "puissance",

      name: selectedStation.nom_station || "-",
      id: selectedStation.id_station || "-",
      dept: getDeptLabel(selectedStation),
      connector: getConnectorText(selectedStation),
      power: `${selectedStation.puissance_max ?? "N/A"} kW`,
      points: selectedStation.nbre_pdc || "-",
      access: selectedStation.condition_acces || "-",

      implantation_station: selectedStation.implantation_station || "unknown",
      condition_acces: selectedStation.condition_acces || "unknown",
      nbre_pdc: selectedStation.nbre_pdc || 0,

      prise_type_ef: selectedStation.has_ef || 0,
      prise_type_2: selectedStation.has_type_2 || 0,
      prise_type_combo_ccs: selectedStation.has_combo_ccs || 0,
      prise_type_chademo: selectedStation.has_chademo || 0,
      prise_type_autre: selectedStation.has_autre || 0,

      station_deux_roues: selectedStation.station_deux_roues || 0,

      consolidated_latitude: selectedStation.consolidated_latitude || 0,
      consolidated_longitude: selectedStation.consolidated_longitude || 0,
      lat: selectedStation.consolidated_latitude || 0,
      lon: selectedStation.consolidated_longitude || 0,

      horaires: selectedStation.horaires || "",
      tarification: selectedStation.tarification || "",
      gratuit: selectedStation.gratuit ?? selectedStation.is_gratuit ?? 0
    });

    window.location.href = `puissance.html?${params.toString()}`;
  });
});