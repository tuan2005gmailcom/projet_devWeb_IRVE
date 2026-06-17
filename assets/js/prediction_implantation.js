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

function renderModelResults(models) {
  const container = document.getElementById("modelResultsList");

  if (!container) {
    return;
  }

  if (!models || Object.keys(models).length === 0) {
    container.innerHTML = `
      <div><span>Modèles</span><strong>Non disponibles</strong></div>
    `;
    return;
  }

  container.innerHTML = "";

  Object.entries(models).forEach(([modelName, modelResult]) => {
    const prediction = modelResult.prediction || "-";

    const row = document.createElement("div");
    row.innerHTML = `
      <span>${modelName}</span>
      <strong>${prediction}</strong>
    `;

    container.appendChild(row);
  });
}

function renderProbabilities(probabilities) {
  const probabilityList = document.getElementById("probabilityList");

  if (!probabilityList) {
    return;
  }

  probabilityList.innerHTML = "";

  if (!probabilities || Object.keys(probabilities).length === 0) {
    probabilityList.innerHTML = `<p class="panel-note">Aucune probabilité retournée par le modèle.</p>`;
    return;
  }

  const entries = Object.entries(probabilities)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  entries.forEach(([label, probability]) => {
    const percent = Math.round(Number(probability) * 100);

    const row = document.createElement("div");
    row.className = "pretty-progress-row";

    row.innerHTML = `
      <div class="pretty-progress-top">
        <strong>${label}</strong>
        <span>${percent} %</span>
      </div>
      <div class="pretty-progress-track">
        <span class="pretty-progress-fill" style="width:${percent}%"></span>
      </div>
    `;

    probabilityList.appendChild(row);
  });
}

async function loadImplantationPrediction() {
  const params = new URLSearchParams(window.location.search);

  setText("summaryName", params.get("name"));
  setText("summaryId", params.get("id"));
  setText("summaryDept", params.get("dept"));
  setText("summaryConnector", params.get("connector"));
  setText("summaryPoints", params.get("points"));
  setText("summaryAccess", params.get("access"));

  if (!params.get("puissance_nominale")) {
    params.set("puissance_nominale", "0");
  }

  const status = document.getElementById("implantationStatus");
  const statusBadge = document.getElementById("predictionStatusBadge");
  const mainResult = document.getElementById("implantationMainResult");

  const required = ["lat", "lon", "nbre_pdc"];
  const missing = required.filter(key => !params.get(key));

  if (missing.length > 0) {
    status.textContent = "Données manquantes : " + missing.join(", ") + ". Retournez à la page Visualisation.";
    statusBadge.textContent = "Erreur";
    mainResult.textContent = "Impossible";
    renderModelResults(null);
    renderProbabilities(null);
    return;
  }

  try {
    status.textContent = "Appel des modèles Python...";
    statusBadge.textContent = "En cours";

    const response = await fetch(`php/predict_implantation.php?${params.toString()}`);
    const text = await response.text();

    console.log("Réponse brute predict_implantation.php :", text);

    const data = JSON.parse(text);

    if (!data.success) {
      console.error(data);
      status.textContent = "Erreur : " + (data.error || "Réponse invalide.");
      statusBadge.textContent = "Erreur";
      mainResult.textContent = "Erreur";
      renderModelResults(data.models);
      renderProbabilities(null);
      return;
    }

    const prediction = data.final_prediction || data.prediction_implantation_station || "-";

    mainResult.textContent = prediction;
    status.innerHTML = `Résultat final : la station est prédite comme <strong>${prediction}</strong>.`;
    statusBadge.textContent = "Terminé";

    renderModelResults(data.models);
    renderProbabilities(data.probabilities);

  } catch (error) {
    console.error(error);
    status.textContent = "Erreur pendant l'appel à php/predict_implantation.php. Regarde F12 > Console.";
    statusBadge.textContent = "Erreur";
    mainResult.textContent = "Erreur";
    renderModelResults(null);
    renderProbabilities(null);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  loadImplantationPrediction();
});
