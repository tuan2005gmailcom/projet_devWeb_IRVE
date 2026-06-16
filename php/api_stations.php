<?php
header("Content-Type: application/json; charset=UTF-8");

require_once "config_db.php";

try {
    $sql = "
        SELECT
            s.id_station,
            s.nom_station,
            s.adresse_station,
            s.implantation_station,
            s.nbre_pdc,
            s.condition_acces,
            s.consolidated_latitude,
            s.consolidated_longitude,

            d.code_departement,
            d.nom_departement,

            MAX(p.puissance_nominale) AS puissance_max,

            MAX(p.prise_type_ef) AS has_ef,
            MAX(p.prise_type_2) AS has_type_2,
            MAX(p.prise_type_combo_ccs) AS has_combo_ccs,
            MAX(p.prise_type_chademo) AS has_chademo,
            MAX(p.prise_type_autre) AS has_autre

        FROM `Station` s
        INNER JOIN departement d
            ON s.code_departement = d.code_departement
        LEFT JOIN point_de_charge p
            ON s.id_station = p.id_station

        GROUP BY
            s.id_station,
            s.nom_station,
            s.adresse_station,
            s.implantation_station,
            s.nbre_pdc,
            s.condition_acces,
            s.consolidated_latitude,
            s.consolidated_longitude,
            d.code_departement,
            d.nom_departement

        ORDER BY s.id_station ASC
    ";

    $stmt = $pdo->query($sql);
    $stations = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "count" => count($stations),
        "stations" => $stations
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>