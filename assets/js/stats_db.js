let stations = [];
let currentData = [];

function getConnector(station) {
  if (Number(station.has_combo_ccs) === 1) return "CCS Combo 2";
  if (Number(station.has_type_2) === 1) return "Type 2";
  if (Number(station.has_chademo) === 1) return "CHAdeMO";
  if (Number(station.has_ef) === 1) return "EF";
  if (Number(station.has_autre) === 1) return "Autre";
  return "Non renseigné";
}

function getDeptLabel(station) {
  return `${station.nom_departement} (${station.code_departement})`;
}

function numberValue(value) {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
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

async function loadStatsFromDatabase() {
  try {
    const response = await fetch("php/api_stations.php");
    const data = await response.json();

    if (!data.success) {
      alert("Erreur API : " + data.error);
      return;
    }

    stations = data.stations;
    currentData = stations;

    fillDepartmentSelect();
    updateStatsPage();

  } catch (error) {
    console.error(error);
    alert("Erreur pendant le chargement des statistiques MySQL.");
  }
}

function fillDepartmentSelect() {
  const deptSelect = document.getElementById("statsDeptSelect");
  const departments = [...new Set(stations.map(getDeptLabel))].sort();

  deptSelect.innerHTML = `<option value="Tous">Tous les départements</option>`;

  departments.forEach(dept => {
    const option = document.createElement("option");
    option.value = dept;
    option.textContent = dept;
    deptSelect.appendChild(option);
  });
}

function fillStationSelect(data) {
  const stationSelect = document.getElementById("statsStationSelect");

  stationSelect.innerHTML = `<option value="">Sélectionner une station</option>`;

  data.forEach(station => {
    const option = document.createElement("option");
    option.value = station.id_station;
    option.textContent = station.nom_station;
    stationSelect.appendChild(option);
  });
}

function getFilteredData() {
  const deptValue = document.getElementById("statsDeptSelect").value;

  if (deptValue === "Tous") {
    return stations;
  }

  return stations.filter(station => getDeptLabel(station) === deptValue);
}

function updateStatsPage() {
  currentData = getFilteredData();

  fillStationSelect(currentData);
  renderTable(currentData);
  renderKpis(currentData);
  renderPowerChart(currentData);
  renderAccessChart(currentData);
  renderConnectorChart(currentData);

  if (currentData.length > 0) {
    renderStationDetail(currentData[0]);
    document.getElementById("statsStationSelect").value = currentData[0].id_station;
  } else {
    clearStationDetail();
  }
}

function renderTable(data) {
  const tbody = document.getElementById("statsTableBody");
  tbody.innerHTML = "";

  data.forEach(station => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>#${station.id_station}</td>
      <td><strong>${station.nom_station}</strong></td>
      <td>${getDeptLabel(station)}</td>
      <td>${station.puissance_max ?? "N/A"} kW</td>
      <td>${station.nbre_pdc}</td>
      <td>${getConnector(station)}</td>
      <td>${station.condition_acces || "Non précisé"}</td>
    `;

    tr.addEventListener("click", () => {
      document.getElementById("statsStationSelect").value = station.id_station;
      renderStationDetail(station);
    });

    tbody.appendChild(tr);
  });
}

function renderKpis(data) {
  const nbStations = data.length;
  const totalPoints = data.reduce((sum, s) => sum + numberValue(s.nbre_pdc), 0);

  const powers = data
    .map(s => numberValue(s.puissance_max))
    .filter(v => v > 0);

  const avgPower = powers.length
    ? powers.reduce((a, b) => a + b, 0) / powers.length
    : 0;

  const maxPower = powers.length ? Math.max(...powers) : 0;

  const accessLibreStations = data.filter(s =>
    String(s.condition_acces || "").toLowerCase().includes("libre")
  ).length;

  const accessLibrePercent = nbStations
    ? (accessLibreStations / nbStations) * 100
    : 0;

  const connectorCounts = countConnectors(data);
  const mainConnector = Object.entries(connectorCounts)
    .sort((a, b) => b[1] - a[1])[0];

  document.getElementById("statNbStations").textContent = nbStations;
  document.getElementById("statTotalPoints").textContent = totalPoints;
  document.getElementById("statAvgPower").textContent = `${avgPower.toFixed(1)} kW`;
  document.getElementById("statMaxPower").textContent = `${maxPower.toFixed(1)} kW`;
  document.getElementById("statAccessLibrePercent").textContent = `${accessLibrePercent.toFixed(0)} %`;
  document.getElementById("statMainConnector").textContent = mainConnector ? mainConnector[0] : "-";
}

function renderStationDetail(station) {
  document.getElementById("detailName").textContent = station.nom_station;
  document.getElementById("detailId").textContent = `#${station.id_station}`;
  document.getElementById("detailDept").textContent = getDeptLabel(station);
  document.getElementById("detailConnector").textContent = getConnector(station);
  document.getElementById("detailPower").textContent = `${station.puissance_max ?? "N/A"} kW`;
  document.getElementById("detailAccess").textContent =
    station.condition_acces || "Non précisé";
}

function clearStationDetail() {
  document.getElementById("detailName").textContent = "-";
  document.getElementById("detailId").textContent = "-";
  document.getElementById("detailDept").textContent = "-";
  document.getElementById("detailConnector").textContent = "-";
  document.getElementById("detailPower").textContent = "-";
  document.getElementById("detailAccess").textContent = "-";
}

function renderPowerChart(data) {
  const chart = document.getElementById("powerStatsChart");
  chart.innerHTML = "";

  const sorted = [...data]
    .sort((a, b) => numberValue(b.puissance_max) - numberValue(a.puissance_max))
    .slice(0, 10);

  const maxPower = Math.max(...sorted.map(s => numberValue(s.puissance_max)), 1);

  sorted.forEach(station => {
    const power = numberValue(station.puissance_max);
    const percent = (power / maxPower) * 100;

    const row = document.createElement("div");
    row.className = "pretty-bar-row";

    row.innerHTML = `
      <div class="pretty-bar-info">
        <strong>${station.nom_station}</strong>
        <span>${getDeptLabel(station)}</span>
      </div>

      <div class="pretty-bar-track">
        <span class="pretty-bar-fill" style="width:${percent}%"></span>
      </div>

      <div class="pretty-bar-value">${power.toFixed(0)} kW</div>
    `;

    chart.appendChild(row);
  });
}

function renderAccessChart(data) {
  const chart = document.getElementById("accessStatsChart");
  chart.innerHTML = "";

  const total = data.length || 1;

  const libre = data.filter(s =>
    String(s.condition_acces || "").toLowerCase().includes("libre")
  ).length;

  const reserve = data.filter(s => {
    const access = String(s.condition_acces || "").toLowerCase();
    return access.includes("réserv") || access.includes("reserv");
  }).length;

  const other = data.length - libre - reserve;

  const rows = [
    { label: "Accès libre", value: libre },
    { label: "Accès réservé", value: reserve },
    { label: "Non précisé", value: other }
  ];

  rows.forEach(item => {
    const percent = (item.value / total) * 100;

    const row = document.createElement("div");
    row.className = "pretty-progress-row";

    row.innerHTML = `
      <div class="pretty-progress-top">
        <strong>${item.label}</strong>
        <span>${percent.toFixed(0)} %</span>
      </div>
      <div class="pretty-progress-track">
        <span class="pretty-progress-fill" style="width:${percent}%"></span>
      </div>
    `;

    chart.appendChild(row);
  });
}

function countConnectors(data) {
  const counts = {
    "CCS Combo 2": 0,
    "Type 2": 0,
    "CHAdeMO": 0,
    "EF": 0,
    "Autre": 0
  };

  data.forEach(station => {
    if (Number(station.has_combo_ccs) === 1) counts["CCS Combo 2"]++;
    if (Number(station.has_type_2) === 1) counts["Type 2"]++;
    if (Number(station.has_chademo) === 1) counts["CHAdeMO"]++;
    if (Number(station.has_ef) === 1) counts["EF"]++;
    if (Number(station.has_autre) === 1) counts["Autre"]++;
  });

  return counts;
}

function renderConnectorChart(data) {
  const chart = document.getElementById("connectorStatsChart");
  chart.innerHTML = "";

  const counts = countConnectors(data);
  const maxValue = Math.max(...Object.values(counts), 1);

  Object.entries(counts).forEach(([label, value]) => {
    const percent = (value / maxValue) * 100;

    const row = document.createElement("div");
    row.className = "pretty-progress-row";

    row.innerHTML = `
      <div class="pretty-progress-top">
        <strong>${label}</strong>
        <span>${value}</span>
      </div>
      <div class="pretty-progress-track">
        <span class="pretty-progress-fill blue" style="width:${percent}%"></span>
      </div>
    `;

    chart.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  loadStatsFromDatabase();

  document.getElementById("statsDeptSelect").addEventListener("change", updateStatsPage);

  document.getElementById("statsStationSelect").addEventListener("change", event => {
    const id = event.target.value;
    const station = currentData.find(s => String(s.id_station) === String(id));

    if (station) {
      renderStationDetail(station);
    } else {
      clearStationDetail();
    }
  });
});