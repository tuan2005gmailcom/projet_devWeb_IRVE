<?php
header("Content-Type: application/json; charset=UTF-8");

/*
  Ce fichier sert de pont entre la page web et le modèle Python.
  Il prépare les données de la station, lance Python, puis retourne le résultat en JSON.

  Structure attendue :

  root/
  ├── implantation.html
  ├── php/
  │   └── predict_implantation.php
  ├── assets/
  │   └── js/
  │       └── prediction_implantation.js
  └── python/
      └── implantation/
          ├── implantation.py
          ├── model_implantation_randomforest.pkl
          ├── model_implantation_gradientboost.pkl
          ├── model_implantation_XGBoost.pkl
          ├── model_implantation_logisticregression.pkl
          ├── label_encoder_implantation.pkl
          └── features_implantation.pkl
*/

// Récupère une valeur sans provoquer d’erreur si la clé n’existe pas.
function get_value($data, $key, $default = "") {
    return isset($data[$key]) ? $data[$key] : $default;
}

// Convertit les valeurs reçues en nombres utilisables par le modèle.
function numeric_value($value, $default = 0) {
    if ($value === null || $value === "") return $default;

    $value = str_replace("kW", "", (string)$value);
    $value = str_replace(",", ".", $value);
    $value = trim($value);

    return is_numeric($value) ? $value : $default;
}

// Utile si Python affiche du texte avant le vrai JSON.
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

// On accepte les données envoyées en JSON ou en paramètres GET.
$rawBody = file_get_contents("php://input");
$bodyData = json_decode($rawBody, true);

if (is_array($bodyData)) {
    $input = $bodyData;
} else {
    $input = $_GET;
}

// Données finales envoyées au script Python.
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
        "error" => "Script Python introuvable. Vérifie le chemin : python/implantation/implantation.py"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$workDir = dirname($script);

/*
  Serveur Linux : python3
  WAMP / Windows : remplacer python3 par python
*/
$python = "python3";
$command = escapeshellcmd($python) . " " . escapeshellarg($script);

$descriptors = [
    0 => ["pipe", "r"],
    1 => ["pipe", "w"],
    2 => ["pipe", "w"]
];

/*
  On lance Python depuis son dossier pour qu’il retrouve correctement les fichiers .pkl.
*/
$process = proc_open($command, $descriptors, $pipes, $workDir);

if (!is_resource($process)) {
    echo json_encode([
        "success" => false,
        "error" => "Impossible de lancer Python depuis PHP."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Envoi du payload au script Python par l’entrée standard.
fwrite($pipes[0], json_encode($payload, JSON_UNESCAPED_UNICODE));
fclose($pipes[0]);

$stdout = stream_get_contents($pipes[1]);
fclose($pipes[1]);

$stderr = stream_get_contents($pipes[2]);
fclose($pipes[2]);

$returnCode = proc_close($process);

// Lecture du résultat retourné par Python.
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
    $result["error"] = "Python a retourné un code d'erreur : " . $returnCode;
    $result["stderr"] = $stderr;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
?>
