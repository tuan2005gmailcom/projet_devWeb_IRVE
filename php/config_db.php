<?php
define('DB_USER', "ct_dinh");
define('DB_PASSWORD', "VFKMszL-QKmmRVIk");
define('DB_NAME', "ct_dinh");
define('DB_SERVER', "ct-dinh.projets.isen-ouest.info");

try {
    $pdo = new PDO(
        "mysql:host=" . DB_SERVER . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASSWORD,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    header("Content-Type: application/json; charset=UTF-8");
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "error" => "Erreur connexion MySQL : " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);

    exit;
}
?>