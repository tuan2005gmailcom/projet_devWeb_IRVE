function initMenuPower() {
  const menuButton = document.getElementById("menuButton");
  const mainNav = document.getElementById("mainNav");

  if (menuButton && mainNav) {
    menuButton.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });
  }
}

function setPowerText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value || "-";
  }
}

async function loadPowerPrediction() {
  const params = new URLSearchParams(window.location.search);

  setPowerText("summaryName", params.get("name"));
  setPowerText("summaryId", params.get("id"));
  setPowerText("summaryDept", params.get("dept"));
  setPowerText("summaryConnector", params.get("connector"));
  setPowerText("summaryPower", params.get("power"));
  setPowerText("summaryPoints", params.get("points"));
  setPowerText("summaryAccess", params.get("access"));

  const mainResult = document.getElementById("powerMainResult");
  const rfResult = document.getElementById("rfPowerResult");
  const unitResult = document.getElementById("powerUnitResult");
  const status = document.getElementById("powerStatus");
  const badge = document.getElementById("powerStatusBadge");

  try {
    if (mainResult) mainResult.textContent = "Chargement...";
    if (rfResult) rfResult.textContent = "Chargement...";
    if (status) status.textContent = "Appel du modèle Python...";
    if (badge) badge.textContent = "En cours";

    const response = await fetch(`php/predict_puissance.php?${params.toString()}`);
    const data = await response.json();

    if (!data.success) {
      console.error(data);

      if (mainResult) mainResult.textContent = "Erreur";
      if (rfResult) rfResult.textContent = "Erreur";
      if (status) {
        status.textContent = "Erreur : " + (data.details || data.error || "Réponse invalide.");
      }
      if (badge) badge.textContent = "Erreur";

      return;
    }

    const value = `${data.predicted_puissance_nominale} ${data.unit || "kW"}`;

    if (mainResult) mainResult.textContent = value;
    if (rfResult) rfResult.textContent = value;
    if (unitResult) unitResult.textContent = data.unit || "kW";
    if (status) status.innerHTML = `Résultat calculé : puissance prédite = <strong>${value}</strong>.`;
    if (badge) badge.textContent = "Terminé";

  } catch (error) {
    console.error(error);

    if (mainResult) mainResult.textContent = "Erreur";
    if (rfResult) rfResult.textContent = "Erreur";
    if (status) status.textContent = "Erreur pendant l'appel à php/predict_puissance.php.";
    if (badge) badge.textContent = "Erreur";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMenuPower();
  loadPowerPrediction();
});