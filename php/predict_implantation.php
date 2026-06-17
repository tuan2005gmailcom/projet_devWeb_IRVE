<?php
header("Content-Type: application/json; charset=UTF-8");

/*
  PHP bridge for implantation prediction.
  Expected structure:

  root/
  ├── prediction.html
  ├── php/
  │   └── predict_implantation.php
  └── python/
      └── implantation/
          ├── implantation.py
          ├── model_implantation.pkl
          ├── label_encoder_implantation.pkl
          └── features_implantation.pkl
*/

function get_value($data, $key, $default = "") {
    return isset($data[$key]) ? $data[$key] : $default;
}

function numeric_value($value, $default = 0) {
    if ($value === null || $value === "") return $default;
    $value = str_replace("kW", "", (string)$value);
    $value = str_replace(",", ".", $value);
    $value = trim($value);
    return is_numeric($value) ? $value : $default;
}

function extract_json_from_text($text) {
    $pos = strpos($text, "{");
    while ($pos !== false) {
        $candidate = substr($text, $pos);
        $decoded = json_decode($candidate, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }
        $pos = strpos($text, "{", $pos + 1);
    }
    return null;
}

$rawBody = file_get_contents("php://input");
$bodyData = json_decode($rawBody, true);

if (is_array($bodyData)) {
    $input = $bodyData;
} else {
    $input = $_GET;
}

$payload = [
    "nbre_pdc" => numeric_value(get_value($input, "nbre_pdc", get_value($input, "points", 0))),
    "puissance_nominale" => numeric_value(get_value($input, "puissance_nominale", get_value($input, "power", 0))),
    "consolidated_longitude" => numeric_value(get_value($input, "consolidated_longitude", get_value($input, "lon", 0))),
    "consolidated_latitude" => numeric_value(get_value($input, "consolidated_latitude", get_value($input, "lat", 0))),

    "prise_type_ef" => numeric_value(get_value($input, "prise_type_ef", 0)),
    "prise_type_2" => numeric_value(get_value($input, "prise_type_2", 0)),
    "prise_type_combo_ccs" => numeric_value(get_value($input, "prise_type_combo_ccs", 0)),
    "prise_type_chademo" => numeric_value(get_value($input, "prise_type_chademo", 0)),
    "prise_type_autre" => numeric_value(get_value($input, "prise_type_autre", 0)),

    "gratuit" => get_value($input, "gratuit", 0),
    "station_deux_roues" => get_value($input, "station_deux_roues", 0),
    "condition_acces" => get_value($input, "condition_acces", get_value($input, "access", "unknown")),
    "tarification" => get_value($input, "tarification", ""),
    "horaires" => get_value($input, "horaires", "")
];

$script = realpath(__DIR__ . "/../python/implantation/implantation.py");

if ($script === false) {
    echo json_encode([
        "success" => false,
        "error" => "Script Python introuvable. Vérifie le chemin: python/implantation/implantation.py"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
  If your server uses Windows/WAMP, replace python3 with python.
*/
$python = "python3";
$command = escapeshellcmd($python) . " " . escapeshellarg($script);

$descriptors = [
    0 => ["pipe", "r"],
    1 => ["pipe", "w"],
    2 => ["pipe", "w"]
];

$process = proc_open($command, $descriptors, $pipes);

if (!is_resource($process)) {
    echo json_encode([
        "success" => false,
        "error" => "Impossible de lancer Python depuis PHP."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

fwrite($pipes[0], json_encode($payload, JSON_UNESCAPED_UNICODE));
fclose($pipes[0]);

$stdout = stream_get_contents($pipes[1]);
fclose($pipes[1]);

$stderr = stream_get_contents($pipes[2]);
fclose($pipes[2]);

$returnCode = proc_close($process);

$result = json_decode(trim($stdout), true);

if ($result === null) {
    $result = extract_json_from_text($stdout);
}

if ($result === null) {
    echo json_encode([
        "success" => false,
        "error" => "Réponse Python invalide.",
        "return_code" => $returnCode,
        "stdout" => $stdout,
        "stderr" => $stderr,
        "payload_sent" => $payload
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($result["success"])) {
    $result["success"] = true;
}

$result["payload_sent"] = $payload;

if ($returnCode !== 0 && empty($result["error"])) {
    $result["success"] = false;
    $result["error"] = "Python a retourné un code d'erreur: " . $returnCode;
    $result["stderr"] = $stderr;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
?>
