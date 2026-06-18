<?php
header("Content-Type: application/json; charset=UTF-8");

// La prédiction a besoin des coordonnées de la station sélectionnée.
if (!isset($_GET["lat"]) || !isset($_GET["lon"])) {
    echo json_encode([
        "success" => false,
        "error" => "Latitude ou longitude manquante."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$lat = $_GET["lat"];
$lon = $_GET["lon"];

// Petite vérification pour éviter d’envoyer de mauvaises valeurs au script Python.
if (!is_numeric($lat) || !is_numeric($lon)) {
    echo json_encode([
        "success" => false,
        "error" => "Coordonnées invalides."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Commande Python utilisée sur le serveur.
$python = "python3";
// Sur WAMP Windows, remplace par :
// $python = "python";

// Chemin vers le script qui contient le modèle de clustering.
$script = realpath(__DIR__ . "/../python/clustering/clusters_map_web.py");

if ($script === false) {
    echo json_encode([
        "success" => false,
        "error" => "Script Python introuvable."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
  Ici, on demande seulement un résultat JSON.
  Le script Python ne crée donc pas de fichier carte.
*/
$command = escapeshellcmd($python) . " "
    . escapeshellarg($script)
    . " --lat " . escapeshellarg($lat)
    . " --lon " . escapeshellarg($lon)
    . " --json";

// Lancement du script Python depuis PHP.
$output = shell_exec($command);

if ($output === null || trim($output) === "") {
    echo json_encode([
        "success" => false,
        "error" => "Le script Python ne retourne rien.",
        "command" => $command
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Transformation de la réponse Python en tableau PHP.
$result = json_decode($output, true);

if ($result === null) {
    echo json_encode([
        "success" => false,
        "error" => "Réponse Python invalide.",
        "raw_output" => $output,
        "command" => $command
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
?>