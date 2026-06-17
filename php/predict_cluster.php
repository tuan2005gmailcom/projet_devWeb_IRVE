<?php
header("Content-Type: application/json; charset=UTF-8");

if (!isset($_GET["lat"]) || !isset($_GET["lon"])) {
    echo json_encode([
        "success" => false,
        "error" => "Latitude ou longitude manquante."
    ]);
    exit;
}

$lat = $_GET["lat"];
$lon = $_GET["lon"];

if (!is_numeric($lat) || !is_numeric($lon)) {
    echo json_encode([
        "success" => false,
        "error" => "Coordonnées invalides."
    ]);
    exit;
}

/*
  Si tu es sur Linux serveur : python3
  Si tu es sur Wamp Windows : python
*/
$python = "python3";

$script = realpath(__DIR__ . "/../python/clustering/clusters_map_web.py");

if ($script === false) {
    echo json_encode([
        "success" => false,
        "error" => "Script Python introuvable."
    ]);
    exit;
}

$mapDir = __DIR__ . "/../maps";

if (!is_dir($mapDir)) {
    mkdir($mapDir, 0777, true);
}

$mapFileName = "cluster_map_" . time() . "_" . rand(1000, 9999) . ".html";
$mapPath = realpath($mapDir) . DIRECTORY_SEPARATOR . $mapFileName;
$mapUrl = "maps/" . $mapFileName;

$command = escapeshellcmd($python) . " "
    . escapeshellarg($script)
    . " --lat " . escapeshellarg($lat)
    . " --lon " . escapeshellarg($lon)
    . " --output " . escapeshellarg($mapPath)
    . " --json";

$output = shell_exec($command);

if ($output === null || trim($output) === "") {
    echo json_encode([
        "success" => false,
        "error" => "Le script Python ne retourne rien."
    ]);
    exit;
}

$result = json_decode($output, true);

if ($result === null) {
    echo json_encode([
        "success" => false,
        "error" => "Réponse Python invalide.",
        "raw_output" => $output
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$result["map_url"] = $mapUrl;

echo json_encode($result, JSON_UNESCAPED_UNICODE);
?>