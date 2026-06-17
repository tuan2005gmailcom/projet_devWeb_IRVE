<?php
header("Content-Type: application/json; charset=UTF-8");

$python = "python3";
// Si tu es sur WAMP/Windows, remplace par :
// $python = "python";

$workDir = realpath(__DIR__ . "/../python/puissance");
$script = $workDir . DIRECTORY_SEPARATOR . "puissance.py";

if ($workDir === false || !file_exists($script)) {
    echo json_encode([
        "success" => false,
        "error" => "Dossier ou script puissance.py introuvable."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$payload = [
    "implantation_station" => $_GET["implantation_station"] ?? "unknown",
    "condition_acces" => $_GET["condition_acces"] ?? "unknown",
    "nbre_pdc" => $_GET["nbre_pdc"] ?? 0,

    "prise_type_ef" => $_GET["prise_type_ef"] ?? 0,
    "prise_type_2" => $_GET["prise_type_2"] ?? 0,
    "prise_type_combo_ccs" => $_GET["prise_type_combo_ccs"] ?? 0,
    "prise_type_chademo" => $_GET["prise_type_chademo"] ?? 0,
    "prise_type_autre" => $_GET["prise_type_autre"] ?? 0,

    "station_deux_roues" => $_GET["station_deux_roues"] ?? 0,

    "consolidated_longitude" => $_GET["consolidated_longitude"] ?? ($_GET["lon"] ?? 0),
    "consolidated_latitude" => $_GET["consolidated_latitude"] ?? ($_GET["lat"] ?? 0),

    "horaires" => $_GET["horaires"] ?? "",
    "tarification" => $_GET["tarification"] ?? "",
    "gratuit" => $_GET["gratuit"] ?? 0
];

$cmd = escapeshellcmd($python) . " " . escapeshellarg($script);

$descriptors = [
    0 => ["pipe", "r"],
    1 => ["pipe", "w"],
    2 => ["pipe", "w"]
];

$process = proc_open($cmd, $descriptors, $pipes, $workDir);

if (!is_resource($process)) {
    echo json_encode([
        "success" => false,
        "error" => "Impossible de lancer le script Python."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

fwrite($pipes[0], json_encode($payload, JSON_UNESCAPED_UNICODE));
fclose($pipes[0]);

$output = stream_get_contents($pipes[1]);
$errorOutput = stream_get_contents($pipes[2]);

fclose($pipes[1]);
fclose($pipes[2]);

$returnCode = proc_close($process);

$result = json_decode($output, true);

if ($result === null) {
    echo json_encode([
        "success" => false,
        "error" => "Réponse Python invalide.",
        "raw_output" => $output,
        "stderr" => $errorOutput,
        "return_code" => $returnCode
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
?>