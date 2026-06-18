// Gestion du menu mobile pour cette page.
function initMenuPower() {
  const menuButton = document.getElementById("menuButton");
  const mainNav = document.getElementById("mainNav");

  if (menuButton && mainNav) {
    menuButton.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });
  }
}

// Remplit les informations de la station dans le résumé.
function setPowerText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value || "-";
  }
}

// Formate la puissance avec deux décimales et l’unité.
function formatKw(value, unit = "kW") {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "-";
  }

  return `${number.toFixed(2)} ${unit}`;
}

// Affiche les résultats retournés par les différents modèles de régression.
function renderPowerModelResults(models, unit = "kW") {
  const container = document.getElementById("powerModelResultsList");

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

  Object.entries(models).forEach(([modelName, result]) => {
    const row = document.createElement("div");

    if (result.success === false) {
      row.innerHTML = `
        <span>${modelName}</span>
        <strong>Erreur</strong>
      `;
    } else {
      row.innerHTML = `
        <span>${modelName}</span>
        <strong>${formatKw(result.prediction, result.unit || unit)}</strong>
      `;
    }

    container.appendChild(row);
  });
}

// Appelle le fichier PHP qui lance les modèles Python de puissance.
async function loadPowerPrediction() {
  const params = new URLSearchParams(window.location.search);

  setPowerText("summaryName", params.get("name"));
  setPowerText("summaryId", params.get("id"));
  setPowerText("summaryDept", params.get("dept"));
  setPowerText("summaryConnector", params.get("connector"));
  setPowerText("summaryPoints", params.get("points"));
  setPowerText("summaryAccess", params.get("access"));

  const mainResult = document.getElementById("powerMainResult");
  const rfResult = document.getElementById("rfPowerResult");
  const unitResult = document.getElementById("powerUnitResult");
  const averageResult = document.getElementById("averagePowerResult");
  const methodResult = document.getElementById("finalPowerMethodResult");
  const status = document.getElementById("powerStatus");
  const badge = document.getElementById("powerStatusBadge");

  try {
    if (mainResult) mainResult.textContent = "Chargement...";
    if (rfResult) rfResult.textContent = "Chargement...";
    if (averageResult) averageResult.textContent = "Chargement...";
    if (methodResult) methodResult.textContent = "-";
    if (status) status.textContent = "Appel des modèles Python...";
    if (badge) badge.textContent = "En cours";

    const response = await fetch(`php/predict_puissance.php?${params.toString()}`);
    const text = await response.text();
    console.log("Réponse brute predict_puissance.php :", text);

    const data = JSON.parse(text);

    if (!data.success) {
      console.error(data);

      if (mainResult) mainResult.textContent = "Erreur";
      if (rfResult) rfResult.textContent = "Erreur";
      if (averageResult) averageResult.textContent = "Erreur";
      if (methodResult) methodResult.textContent = "Erreur";
      if (status) {
        status.textContent = "Erreur : " + (data.details || data.error || "Réponse invalide.");
      }
      if (badge) badge.textContent = "Erreur";

      renderPowerModelResults(data.models || null, data.unit || "kW");
      return;
    }

    const unit = data.unit || "kW";
    const finalValue = data.final_prediction ?? data.predicted_puissance_nominale;
    const finalText = formatKw(finalValue, unit);

    if (mainResult) mainResult.textContent = finalText;

    // Petit garde-fou si une ancienne version du HTML utilise encore rfPowerResult
    if (rfResult) {
      const rfPrediction = data.models?.["Random Forest"]?.prediction ?? finalValue;
      rfResult.textContent = formatKw(rfPrediction, unit);
    }

    if (unitResult) unitResult.textContent = unit;
    if (averageResult) averageResult.textContent = formatKw(data.average_prediction, unit);
    if (methodResult) methodResult.textContent = data.final_method || "-";

    renderPowerModelResults(data.models, unit);

    if (status) {
      status.innerHTML = `
        Résultat calculé : puissance prédite = <strong>${finalText}</strong>.
        Méthode finale : <strong>${data.final_method || "-"}</strong>.
      `;
    }

    if (badge) badge.textContent = "Terminé";

  } catch (error) {
    console.error(error);

    if (mainResult) mainResult.textContent = "Erreur";
    if (rfResult) rfResult.textContent = "Erreur";
    if (averageResult) averageResult.textContent = "Erreur";
    if (methodResult) methodResult.textContent = "Erreur";
    if (status) status.textContent = "Erreur pendant l'appel à php/predict_puissance.php. Regarde F12 > Console.";
    if (badge) badge.textContent = "Erreur";
  }
}

// Lancement automatique lorsque la page est prête.
document.addEventListener("DOMContentLoaded", () => {
  initMenuPower();
  loadPowerPrediction();
});
