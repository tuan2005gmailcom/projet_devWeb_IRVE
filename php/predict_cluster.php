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
  Change this depending on your installation:
  - Windows/Wamp can use: python
  - Linux server often uses: python3
  - Or full path like:
    C:\\Users\\YourName\\AppData\\Local\\Programs\\Python\\Python312\\python.exe
*/
$python = "python";

$script = __DIR__ . DIRECTORY_SEPARATOR . "clusters_map_web.py";

$command = escapeshellcmd($python) . " "
    . escapeshellarg($script)
    . " --lat " . escapeshellarg($lat)
    . " --lon " . escapeshellarg($lon)
    . " --json";

$output = shell_exec($command);

if ($output === null || trim($output) === "") {
    echo json_encode([
        "success" => false,
        "error" => "Impossible d'exécuter le script Python. Vérifiez shell_exec(), Python et les fichiers .pkl."
    ]);
    exit;
}

$result = json_decode($output, true);

if ($result === null) {
    echo json_encode([
        "success" => false,
        "error" => "Réponse Python invalide.",
        "raw_output" => $output
    ]);
    exit;
}

echo json_encode($result);
?>
