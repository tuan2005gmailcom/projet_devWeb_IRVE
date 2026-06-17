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

function renderProbabilities(probabilities) {
    const probabilityList = document.getElementById("probabilityList");
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
    setText("summaryPower", params.get("power"));
    setText("summaryPoints", params.get("points"));
    setText("summaryAccess", params.get("access"));

    const status = document.getElementById("implantationStatus");
    const statusBadge = document.getElementById("predictionStatusBadge");
    const mainResult = document.getElementById("implantationMainResult");

    if (!params.get("puissance_nominale")) {
        params.set("puissance_nominale", "0");
    }

    const required = ["lat", "lon", "nbre_pdc"];
    const missing = required.filter(key => !params.get(key));

    if (missing.length > 0) {
        status.textContent = "Données manquantes : " + missing.join(", ") + ". Retournez à la page Visualisation.";
        statusBadge.textContent = "Erreur";
        mainResult.textContent = "Impossible";
        return;
    }

    try {
        status.textContent = "Appel du modèle Python...";
        statusBadge.textContent = "En cours";

        const response = await fetch(`php/predict_implantation.php?${params.toString()}`);
        const data = await response.json();

        if (!data.success) {
            console.error(data);
            status.textContent = "Erreur : " + (data.error || "Réponse invalide.");
            statusBadge.textContent = "Erreur";
            mainResult.textContent = "Erreur";
            return;
        }

        const prediction = data.prediction_implantation_station || "-";

        mainResult.textContent = prediction;
        status.innerHTML = `Résultat calculé : la station est prédite comme <strong>${prediction}</strong>.`;
        statusBadge.textContent = "Terminé";

        renderProbabilities(data.probabilities);

    } catch (error) {
        console.error(error);
        status.textContent = "Erreur pendant l'appel à php/predict_implantation.php.";
        statusBadge.textContent = "Erreur";
        mainResult.textContent = "Erreur";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initMenu();
    loadImplantationPrediction();
});