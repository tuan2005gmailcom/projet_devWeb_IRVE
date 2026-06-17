<?php
header("Content-Type: application/json; charset=UTF-8");

if (!isset($_GET["lat"]) || !isset($_GET["lon"])) {
    echo json_encode([
        "success" => false,
        "error" => "Latitude ou longitude manquante."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$lat = $_GET["lat"];
$lon = $_GET["lon"];

if (!is_numeric($lat) || !is_numeric($lon)) {
    echo json_encode([
        "success" => false,
        "error" => "Coordonnées invalides."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$python = "python3";
// Sur WAMP Windows, remplace par :
// $python = "python";

$script = realpath(__DIR__ . "/../python/clustering/clusters_map_web.py");

if ($script === false) {
    echo json_encode([
        "success" => false,
        "error" => "Script Python introuvable."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
  Important :
  On utilise seulement --json.
  On ne met PAS --output.
  Donc Python ne crée aucun fichier carte.
*/
$command = escapeshellcmd($python) . " "
    . escapeshellarg($script)
    . " --lat " . escapeshellarg($lat)
    . " --lon " . escapeshellarg($lon)
    . " --json";

$output = shell_exec($command);

if ($output === null || trim($output) === "") {
    echo json_encode([
        "success" => false,
        "error" => "Le script Python ne retourne rien.",
        "command" => $command
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

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