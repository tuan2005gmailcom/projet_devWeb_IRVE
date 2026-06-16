/*
  JavaScript simple pour le projet IRVE.
  Pas de React : uniquement DOM, événements et redirections.
*/

// Menu mobile
var menuButton = document.getElementById("menuButton");
var mainNav = document.getElementById("mainNav");

if (menuButton && mainNav) {
  menuButton.addEventListener("click", function () {
    mainNav.classList.toggle("open");
  });
}

function getParam(name) {
  var params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function getStationById(id) {
  if (!window.stations || window.stations.length === 0) return null;

  var selectedId = id || localStorage.getItem("selectedStationId") || window.stations[0].id;

  for (var i = 0; i < window.stations.length; i++) {
    if (window.stations[i].id === selectedId) {
      return window.stations[i];
    }
  }

  return window.stations[0];
}

function formatPower(power) {
  return String(power).replace(".", ",") + " kW";
}

function saveSelectedStation(id) {
  localStorage.setItem("selectedStationId", id);
}

var leafletMap = null;
var leafletMarkers = {};

function selectStation(id) {
  saveSelectedStation(id);

  var choices = document.querySelectorAll(".station-choice");
  choices.forEach(function (choice) {
    var input = choice.querySelector("input");
    var isSelected = input && input.value === id;
    choice.classList.toggle("selected", isSelected);
    if (input) input.checked = isSelected;
  });

  // Changement de couleur du point Leaflet sélectionné
  for (var markerId in leafletMarkers) {
    if (leafletMarkers[markerId]) {
      if (markerId === id) {
        leafletMarkers[markerId].setStyle({ color: "#F59E0B", fillColor: "#F59E0B", radius: 10 });
        leafletMarkers[markerId].bringToFront();
      } else {
        leafletMarkers[markerId].setStyle({ color: "#1B6FDB", fillColor: "#1B6FDB", radius: 8 });
      }
    }
  }
}

function createPopupContent(station) {
  return (
    "<strong>" + station.name + "</strong>" +
    "<p>" + station.address + "</p>" +
    "<ul>" +
    "<li>Département : " + station.dept + "</li>" +
    "<li>Points : " + station.points + "</li>" +
    "<li>Puissance : " + formatPower(station.power) + "</li>" +
    "<li>Latitude : " + station.latitude + "</li>" +
    "<li>Longitude : " + station.longitude + "</li>" +
    "</ul>"
  );
}

function openStationOnMap(station) {
  if (!leafletMap || !leafletMarkers[station.id]) return;
  leafletMap.setView([station.latitude, station.longitude], 8);
  leafletMarkers[station.id].openPopup();
}

function renderLeafletMap() {
  var mapDiv = document.getElementById("leafletMap");
  if (!mapDiv || !window.stations || typeof L === "undefined") return;

  leafletMap = L.map("leafletMap").setView([46.6, 2.4], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(leafletMap);

  window.stations.forEach(function (station) {
    var marker = L.circleMarker([station.latitude, station.longitude], {
      radius: 8,
      color: "#1B6FDB",
      fillColor: "#1B6FDB",
      fillOpacity: 0.85,
      weight: 2
    }).addTo(leafletMap);

    marker.bindPopup(createPopupContent(station));

    marker.on("click", function () {
      selectStation(station.id);
    });

    leafletMarkers[station.id] = marker;
  });

  var group = L.featureGroup(Object.values(leafletMarkers));
  leafletMap.fitBounds(group.getBounds(), { padding: [30, 30] });

  selectStation(localStorage.getItem("selectedStationId") || window.stations[0].id);
}

function updateLeafletMarkersVisibility() {
  if (!leafletMap || !window.stations) return;

  var searchInput = document.getElementById("searchInput");
  var deptFilter = document.getElementById("deptFilter");
  var connectorFilter = document.getElementById("connectorFilter");

  var search = searchInput ? searchInput.value.toLowerCase() : "";
  var dept = deptFilter ? deptFilter.value : "Tous";
  var connector = connectorFilter ? connectorFilter.value : "Tous";

  window.stations.forEach(function (station) {
    var marker = leafletMarkers[station.id];
    if (!marker) return;

    var searchOk = station.name.toLowerCase().indexOf(search) !== -1 || station.id.toLowerCase().indexOf(search) !== -1;
    var deptOk = dept === "Tous" || station.dept === dept;
    var connectorOk = connector === "Tous" || station.connector === connector;
    var visible = searchOk && deptOk && connectorOk;

    if (visible) {
      if (!leafletMap.hasLayer(marker)) marker.addTo(leafletMap);
    } else {
      if (leafletMap.hasLayer(marker)) leafletMap.removeLayer(marker);
    }
  });
}

function renderStationList() {
  var list = document.getElementById("stationList");
  if (!list || !window.stations) return;

  list.innerHTML = "";

  window.stations.forEach(function (station, index) {
    var label = document.createElement("label");
    label.className = "station-choice";
    label.setAttribute("data-station", station.name.toLowerCase());
    label.setAttribute("data-id", station.id.toLowerCase());
    label.setAttribute("data-dept", station.dept);
    label.setAttribute("data-connector", station.connector);

    var checked = index === 0 ? "checked" : "";
    var accessClass = station.access === "Gratuit" ? "green" : "orange";

    label.innerHTML =
      '<input type="radio" name="selectedStation" value="' + station.id + '" ' + checked + '>' +
      '<span class="station-content">' +
      '<strong>' + station.name + '</strong>' +
      '<small>' + station.id + ' · ' + station.dept + '</small>' +
      '<span>' +
      '<span class="badge blue">' + station.connector + '</span> ' +
      '<span class="badge ' + accessClass + '">' + station.access + '</span> ' +
      '<span class="badge purple">' + formatPower(station.power) + '</span>' +
      '</span>' +
      '</span>';

    label.addEventListener("click", function () {
      selectStation(station.id);
      openStationOnMap(station);
    });

    list.appendChild(label);
  });

  selectStation(localStorage.getItem("selectedStationId") || window.stations[0].id);
}

function filterStationList() {
  var searchInput = document.getElementById("searchInput");
  var deptFilter = document.getElementById("deptFilter");
  var connectorFilter = document.getElementById("connectorFilter");
  var resultCount = document.getElementById("resultCount");
  var choices = document.querySelectorAll(".station-choice");

  if (!choices.length) return;

  var search = searchInput ? searchInput.value.toLowerCase() : "";
  var dept = deptFilter ? deptFilter.value : "Tous";
  var connector = connectorFilter ? connectorFilter.value : "Tous";
  var visibleCount = 0;

  choices.forEach(function (choice) {
    var station = choice.getAttribute("data-station");
    var id = choice.getAttribute("data-id");
    var rowDept = choice.getAttribute("data-dept");
    var rowConnector = choice.getAttribute("data-connector");

    var searchOk = station.indexOf(search) !== -1 || id.indexOf(search) !== -1;
    var deptOk = dept === "Tous" || rowDept === dept;
    var connectorOk = connector === "Tous" || rowConnector === connector;

    if (searchOk && deptOk && connectorOk) {
      choice.style.display = "flex";
      visibleCount++;
    } else {
      choice.style.display = "none";
    }
  });

  if (resultCount) {
    resultCount.textContent = visibleCount + " résultat" + (visibleCount > 1 ? "s" : "");
  }

  updateLeafletMarkersVisibility();
}

function setupVisualisationPage() {
  var stationList = document.getElementById("stationList");
  if (!stationList) return;

  renderStationList();
  renderLeafletMap();

  var searchInput = document.getElementById("searchInput");
  var deptFilter = document.getElementById("deptFilter");
  var connectorFilter = document.getElementById("connectorFilter");
  var resetFilters = document.getElementById("resetFilters");

  if (searchInput) searchInput.addEventListener("keyup", filterStationList);
  if (deptFilter) deptFilter.addEventListener("change", filterStationList);
  if (connectorFilter) connectorFilter.addEventListener("change", filterStationList);

  if (resetFilters) {
    resetFilters.addEventListener("click", function () {
      searchInput.value = "";
      deptFilter.value = "Tous";
      connectorFilter.value = "Tous";
      filterStationList();
    });
  }

  var closePopup = document.getElementById("closePopup");
  var mapPopup = document.getElementById("mapPopup");
  if (closePopup && mapPopup) {
    closePopup.addEventListener("click", function () {
      mapPopup.classList.remove("show");
    });
  }

  var clusterButton = document.getElementById("goCluster");
  var implantationButton = document.getElementById("goImplantation");
  var powerButton = document.getElementById("goPower");

  if (clusterButton) {
    clusterButton.addEventListener("click", function () {
      var id = localStorage.getItem("selectedStationId") || window.stations[0].id;
      window.location.href = "cluster.html?station=" + encodeURIComponent(id);
    });
  }

  if (implantationButton) {
    implantationButton.addEventListener("click", function () {
      var id = localStorage.getItem("selectedStationId") || window.stations[0].id;
      window.location.href = "prediction.html?type=implantation&station=" + encodeURIComponent(id);
    });
  }

  if (powerButton) {
    powerButton.addEventListener("click", function () {
      var id = localStorage.getItem("selectedStationId") || window.stations[0].id;
      window.location.href = "prediction.html?type=puissance&station=" + encodeURIComponent(id);
    });
  }
}

function getClusterResults(station) {
  var dbscan = "Cluster urbain standard";
  var kmeans = "Groupe K2 : standard";

  if (station.power >= 100) {
    dbscan = "Cluster recharge rapide";
    kmeans = "Groupe K4 : haute puissance";
  } else if (station.points >= 8) {
    dbscan = "Cluster station dense";
    kmeans = "Groupe K3 : beaucoup de points";
  } else if (station.power <= 11) {
    dbscan = "Cluster recharge lente";
    kmeans = "Groupe K1 : faible puissance";
  }

  return { dbscan: dbscan, kmeans: kmeans };
}

function getImplantationResult(station) {
  if (station.power >= 100 || station.connector === "CCS Combo 2") {
    return "Station dédiée à la recharge rapide";
  }

  if (station.points >= 6 && station.access === "Payant") {
    return "Parking privé à usage public";
  }

  if (station.access === "Gratuit") {
    return "Voirie";
  }

  return "Parking public";
}

function getPowerResult(station) {
  if (station.power < 11) return "7,4 kW";
  if (station.power >= 40 && station.power < 100) return "50 kW";
  if (station.power >= 100) return "150 kW";
  return "22 kW";
}

function fillStationSummary(station) {
  var name = document.getElementById("summaryName");
  if (!name) return;

  name.textContent = station.name;
  document.getElementById("summaryId").textContent = station.id;
  document.getElementById("summaryDept").textContent = station.dept;
  document.getElementById("summaryConnector").textContent = station.connector;
  document.getElementById("summaryPower").textContent = formatPower(station.power);
  document.getElementById("summaryPoints").textContent = station.points;
  document.getElementById("summaryAccess").textContent = station.access;
}

function setupClusterPage() {
  var clusterPage = document.getElementById("clusterPage");
  if (!clusterPage) return;

  var station = getStationById(getParam("station"));
  saveSelectedStation(station.id);
  fillStationSummary(station);

  var results = getClusterResults(station);
  document.getElementById("dbscanResult").textContent = results.dbscan;
  document.getElementById("kmeansResult").textContent = results.kmeans;

  document.getElementById("dbscanComment").textContent = "DBSCAN utilise la densité des stations autour du point choisi.";
  document.getElementById("kmeansComment").textContent = "K-means compare le profil de la station avec les autres stations.";
}

function setupPredictionPage() {
  var predictionPage = document.getElementById("predictionPage");
  if (!predictionPage) return;

  var type = getParam("type") || "implantation";
  var station = getStationById(getParam("station"));
  saveSelectedStation(station.id);
  fillStationSummary(station);

  var title = document.getElementById("predictionTitle");
  var implantationPanel = document.getElementById("implantationPanel");
  var powerPanel = document.getElementById("powerPanel");

  if (type === "puissance") {
    title.textContent = "Prédiction de la puissance";
    implantationPanel.style.display = "none";
    powerPanel.style.display = "block";

    var powerResult = getPowerResult(station);
    document.getElementById("rfPowerResult").textContent = powerResult;
    document.getElementById("treePowerResult").textContent = powerResult;
    document.getElementById("powerMainResult").textContent = powerResult;
  } else {
    title.textContent = "Prédiction de l’implantation";
    implantationPanel.style.display = "block";
    powerPanel.style.display = "none";

    var implantation = getImplantationResult(station);
    document.getElementById("implantationMainResult").textContent = implantation;
    document.getElementById("rfImplantation").textContent = implantation;
    document.getElementById("xgbImplantation").textContent = implantation;
    document.getElementById("gbImplantation").textContent = implantation;
  }
}

setupVisualisationPage();
setupClusterPage();
setupPredictionPage();

// Page Statistiques : calculs simples sur les stations d'un département
function getUniqueDepartments() {
  var departments = [];

  if (!window.stations) return departments;

  window.stations.forEach(function (station) {
    if (departments.indexOf(station.dept) === -1) {
      departments.push(station.dept);
    }
  });

  return departments.sort();
}

function getStationsForDepartment(dept) {
  if (!window.stations) return [];

  if (dept === "Tous") {
    return window.stations;
  }

  return window.stations.filter(function (station) {
    return station.dept === dept;
  });
}

function countByValue(list, key) {
  var counts = {};

  list.forEach(function (item) {
    var value = item[key];
    if (!counts[value]) counts[value] = 0;
    counts[value]++;
  });

  return counts;
}

function getMostFrequent(counts) {
  var bestName = "-";
  var bestValue = 0;

  for (var name in counts) {
    if (counts[name] > bestValue) {
      bestName = name;
      bestValue = counts[name];
    }
  }

  return bestName;
}

function updateText(id, value) {
  var element = document.getElementById(id);
  if (element) element.textContent = value;
}

function drawPowerStatsChart(list) {
  var container = document.getElementById("powerStatsChart");
  if (!container) return;

  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = "<p>Aucune station trouvée.</p>";
    return;
  }

  var maxPower = 1;
  list.forEach(function (station) {
    if (station.power > maxPower) maxPower = station.power;
  });

  list.forEach(function (station) {
    var percent = Math.round((station.power / maxPower) * 100);
    var row = document.createElement("div");
    row.className = "stat-bar-row";
    row.innerHTML =
      '<span class="stat-bar-name">' + station.name + '</span>' +
      '<div class="stat-bar-track"><span class="stat-bar-fill" style="width:' + percent + '%"></span></div>' +
      '<strong>' + formatPower(station.power) + '</strong>';
    container.appendChild(row);
  });
}

function drawProgressStats(containerId, counts, total) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  var colors = ["green", "orange", "purple", ""];
  var index = 0;

  for (var name in counts) {
    var percent = total > 0 ? Math.round((counts[name] / total) * 100) : 0;
    var color = colors[index % colors.length];
    var row = document.createElement("div");
    row.className = "progress-row";
    row.innerHTML =
      '<span>' + name + '</span>' +
      '<div class="progress-track"><span class="progress-fill ' + color + '" style="width:' + percent + '%"></span></div>' +
      '<strong>' + percent + ' %</strong>';
    container.appendChild(row);
    index++;
  }
}

function fillStatsTable(list) {
  var tbody = document.getElementById("statsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  list.forEach(function (station) {
    var accessClass = station.access === "Gratuit" ? "green" : "orange";
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + station.id + "</td>" +
      "<td><strong>" + station.name + "</strong></td>" +
      "<td>" + station.dept + "</td>" +
      "<td>" + formatPower(station.power) + "</td>" +
      "<td>" + station.points + "</td>" +
      '<td><span class="badge blue">' + station.connector + '</span></td>' +
      '<td><span class="badge ' + accessClass + '">' + station.access + '</span></td>';
    tbody.appendChild(tr);
  });
}

function updateStationSelect(list) {
  var stationSelect = document.getElementById("statsStationSelect");
  if (!stationSelect) return;

  stationSelect.innerHTML = "";

  list.forEach(function (station) {
    var option = document.createElement("option");
    option.value = station.id;
    option.textContent = station.name;
    stationSelect.appendChild(option);
  });
}

function updateStationDetail() {
  var stationSelect = document.getElementById("statsStationSelect");
  if (!stationSelect || !window.stations) return;

  var station = getStationById(stationSelect.value);
  if (!station) return;

  updateText("detailName", station.name);
  updateText("detailId", station.id);
  updateText("detailDept", station.dept);
  updateText("detailConnector", station.connector);
  updateText("detailPower", formatPower(station.power));
  updateText("detailAccess", station.access);
}

function updateStatsPage() {
  var deptSelect = document.getElementById("statsDeptSelect");
  if (!deptSelect || !window.stations) return;

  var dept = deptSelect.value;
  var list = getStationsForDepartment(dept);

  updateStationSelect(list);

  var totalPoints = 0;
  var totalPower = 0;
  var maxPower = 0;
  var freeCount = 0;

  list.forEach(function (station) {
    totalPoints += station.points;
    totalPower += station.power;
    if (station.power > maxPower) maxPower = station.power;
    if (station.access === "Gratuit") freeCount++;
  });

  var avgPower = list.length > 0 ? Math.round((totalPower / list.length) * 10) / 10 : 0;
  var freePercent = list.length > 0 ? Math.round((freeCount / list.length) * 100) : 0;
  var connectorCounts = countByValue(list, "connector");
  var accessCounts = countByValue(list, "access");

  updateText("statNbStations", list.length);
  updateText("statTotalPoints", totalPoints);
  updateText("statAvgPower", formatPower(avgPower));
  updateText("statMaxPower", formatPower(maxPower));
  updateText("statFreePercent", freePercent + " %");
  updateText("statMainConnector", getMostFrequent(connectorCounts));

  drawPowerStatsChart(list);
  drawProgressStats("accessStatsChart", accessCounts, list.length);
  drawProgressStats("connectorStatsChart", connectorCounts, list.length);
  fillStatsTable(list);
  updateStationDetail();
}

function setupStatsPage() {
  var statsPage = document.getElementById("statsPage");
  if (!statsPage || !window.stations) return;

  var deptSelect = document.getElementById("statsDeptSelect");
  var stationSelect = document.getElementById("statsStationSelect");

  var departments = getUniqueDepartments();
  departments.forEach(function (dept) {
    var option = document.createElement("option");
    option.value = dept;
    option.textContent = dept;
    deptSelect.appendChild(option);
  });

  deptSelect.addEventListener("change", updateStatsPage);
  stationSelect.addEventListener("change", updateStationDetail);

  updateStatsPage();
}

setupStatsPage();
