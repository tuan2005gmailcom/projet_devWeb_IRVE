<?php
header("Content-Type: application/json; charset=UTF-8");

/*
  Ce fichier sert de pont entre la page web et les modèles Python de régression.
  Il envoie les caractéristiques de la station et récupère la puissance prédite.

  Structure attendue :

  root/
  ├── puissance.html
  ├── php/
  │   └── predict_puissance.php
  └── python/
      └── puissance/
          ├── puissance_multi_model.py  OR puissance.py
          ├── random_forest_puissance.pkl
          ├── decision_tree_puissance.pkl
          ├── linear_regression_puissance.pkl
          └── model_config.pkl
*/

// Récupère une valeur avec une valeur par défaut si elle manque.
function get_value($data, $key, $default = "") {
    return isset($data[$key]) ? $data[$key] : $default;
}

// Nettoie les valeurs comme "22 kW" pour les convertir en nombre.
function numeric_value($value, $default = 0) {
    if ($value === null || $value === "") return $default;

    $value = str_replace("kW", "", (string)$value);
    $value = str_replace(",", ".", $value);
    $value = trim($value);

    return is_numeric($value) ? $value : $default;
}

// Permet de retrouver le JSON même si Python affiche aussi du texte.
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

/*
  Lecture des données :
  - soit en GET depuis puissance.html
  - soit en JSON si on utilise un fetch en POST plus tard
*/
$rawBody = file_get_contents("php://input");
$bodyData = json_decode($rawBody, true);

if (is_array($bodyData)) {
    $input = $bodyData;
} else {
    $input = $_GET;
}

// Données envoyées au modèle Python.
$payload = [
    "implantation_station" => get_value($input, "implantation_station", "unknown"),
    "condition_acces" => get_value($input, "condition_acces", get_value($input, "access", "unknown")),
    "nbre_pdc" => numeric_value(get_value($input, "nbre_pdc", get_value($input, "points", 0))),

    "prise_type_ef" => numeric_value(get_value($input, "prise_type_ef", 0)),
    "prise_type_2" => numeric_value(get_value($input, "prise_type_2", 0)),
    "prise_type_combo_ccs" => numeric_value(get_value($input, "prise_type_combo_ccs", 0)),
    "prise_type_chademo" => numeric_value(get_value($input, "prise_type_chademo", 0)),
    "prise_type_autre" => numeric_value(get_value($input, "prise_type_autre", 0)),

    "station_deux_roues" => get_value($input, "station_deux_roues", 0),

    "consolidated_longitude" => numeric_value(get_value($input, "consolidated_longitude", get_value($input, "lon", 0))),
    "consolidated_latitude" => numeric_value(get_value($input, "consolidated_latitude", get_value($input, "lat", 0))),

    "horaires" => get_value($input, "horaires", ""),
    "tarification" => get_value($input, "tarification", ""),
    "gratuit" => get_value($input, "gratuit", 0)
];

$workDir = realpath(__DIR__ . "/../python/puissance");

if ($workDir === false) {
    echo json_encode([
        "success" => false,
        "error" => "Dossier python/puissance introuvable."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
  On accepte deux noms possibles pour le script Python, selon l’organisation du projet.
*/
$scriptCandidates = [
    $workDir . DIRECTORY_SEPARATOR . "puissance_multi_model.py",
    $workDir . DIRECTORY_SEPARATOR . "puissance.py"
];

$script = null;

foreach ($scriptCandidates as $candidate) {
    if (file_exists($candidate)) {
        $script = $candidate;
        break;
    }
}

if ($script === null) {
    echo json_encode([
        "success" => false,
        "error" => "Script Python introuvable. Place puissance_multi_model.py ou puissance.py dans python/puissance."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
  Serveur Linux : python3
  WAMP / Windows : remplacer python3 par python
*/
$python = "python3";
$cmd = escapeshellcmd($python) . " " . escapeshellarg($script);

$descriptors = [
    0 => ["pipe", "r"],
    1 => ["pipe", "w"],
    2 => ["pipe", "w"]
];

/*
  Le dossier de travail permet à Python de retrouver les modèles .pkl.
*/
$process = proc_open($cmd, $descriptors, $pipes, $workDir);

if (!is_resource($process)) {
    echo json_encode([
        "success" => false,
        "error" => "Impossible de lancer le script Python."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Envoi des données de la station à Python.
fwrite($pipes[0], json_encode($payload, JSON_UNESCAPED_UNICODE));
fclose($pipes[0]);

$stdout = stream_get_contents($pipes[1]);
fclose($pipes[1]);

$stderr = stream_get_contents($pipes[2]);
fclose($pipes[2]);

$returnCode = proc_close($process);

// Décodage de la réponse envoyée par Python.
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
        "payload_sent" => $payload,
        "script_used" => basename($script)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($result["success"])) {
    $result["success"] = true;
}

$result["payload_sent"] = $payload;
$result["script_used"] = basename($script);

if ($returnCode !== 0 && empty($result["error"])) {
    $result["success"] = false;
    $result["error"] = "Python a retourné un code d'erreur : " . $returnCode;
    $result["stderr"] = $stderr;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
?>
