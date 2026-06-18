<?php
// Informations de connexion à la base MySQL.
define('DB_USER', "ct_dinh");
define('DB_PASSWORD', "VFKMszL-QKmmRVIk");
define('DB_NAME', "ct_dinh");
define('DB_SERVER', "127.0.0.1");

try {
    // Création de l’objet PDO utilisé par les autres fichiers PHP.
    $pdo = new PDO(
        "mysql:host=" . DB_SERVER . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASSWORD,
        [
            // Les erreurs SQL seront visibles directement avec des exceptions.
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            // Les résultats sont retournés sous forme de tableau associatif.
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    // Si la connexion échoue, on arrête le script et on renvoie un JSON d’erreur.
    header("Content-Type: application/json; charset=UTF-8");
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "error" => "Erreur connexion MySQL : " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);

    exit;
}
?>