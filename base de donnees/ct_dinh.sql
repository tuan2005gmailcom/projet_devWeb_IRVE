-- phpMyAdmin SQL Dump
-- version 4.6.6deb5ubuntu0.5
-- https://www.phpmyadmin.net/
--
-- Client :  localhost:3306
-- Généré le :  Mer 17 Juin 2026 à 09:27
-- Version du serveur :  5.7.42-0ubuntu0.18.04.1
-- Version de PHP :  7.2.24-0ubuntu0.18.04.17

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données :  `ct_dinh`
--

-- --------------------------------------------------------

--
-- Structure de la table `departement`
--

CREATE TABLE `departement` (
  `code_departement` varchar(8) NOT NULL,
  `nom_departement` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Contenu de la table `departement`
--

INSERT INTO `departement` (`code_departement`, `nom_departement`) VALUES
('02', 'Aisne'),
('13', 'Bouches-du-Rhône'),
('19', 'Corrèze'),
('31', 'Haute-Garonne'),
('32', 'Gers'),
('44', 'Loire-Atlantique'),
('47', 'Lot-et-Garonne'),
('69', 'Rhône'),
('71', 'Saône-et-Loire'),
('83', 'Var'),
('85', 'Vendée');

-- --------------------------------------------------------

--
-- Structure de la table `point_de_charge`
--

CREATE TABLE `point_de_charge` (
  `id_point_charge` int(11) NOT NULL,
  `puissance_nominale` decimal(8,2) NOT NULL,
  `gratuit` tinyint(1) NOT NULL,
  `tarification` varchar(600) NOT NULL,
  `prise_type_ef` tinyint(1) NOT NULL,
  `prise_type_2` tinyint(1) NOT NULL,
  `prise_type_combo_ccs` tinyint(1) NOT NULL,
  `prise_type_chademo` tinyint(1) NOT NULL,
  `prise_type_autre` tinyint(1) NOT NULL,
  `id_station` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Contenu de la table `point_de_charge`
--

INSERT INTO `point_de_charge` (`id_point_charge`, `puissance_nominale`, `gratuit`, `tarification`, `prise_type_ef`, `prise_type_2`, `prise_type_combo_ccs`, `prise_type_chademo`, `prise_type_autre`, `id_station`) VALUES
(1, '11.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 1),
(2, '11.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 1),
(3, '11.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 1),
(4, '11.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 1),
(5, '150.00', 0, '0,59 €/kWh', 0, 0, 1, 0, 0, 1),
(6, '150.00', 0, '0,59 €/kWh', 0, 0, 1, 0, 0, 1),
(7, '22.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 2),
(8, '22.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 2),
(9, '60.00', 0, '0,49 €/kWh', 0, 0, 1, 0, 0, 2),
(10, '22.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 2),
(11, '60.00', 0, '0,49 €/kWh', 0, 0, 1, 0, 0, 2),
(12, '22.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 2),
(13, '11.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 3),
(14, '11.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 3),
(15, '150.00', 0, '0,59 €/kWh', 0, 0, 1, 0, 0, 4),
(16, '150.00', 0, '0,59 €/kWh', 0, 0, 1, 0, 0, 4),
(17, '11.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 4),
(18, '11.00', 0, '0,38 €/kWh', 0, 1, 0, 0, 0, 4),
(19, '50.00', 0, '0,60', 0, 0, 1, 1, 0, 5),
(20, '22.00', 0, '0.36€', 1, 1, 0, 0, 0, 6),
(21, '22.00', 0, '0.36€', 1, 1, 0, 0, 0, 6),
(22, '120.00', 0, '0,58€ / kwh pour les non abonnés.', 0, 0, 1, 0, 0, 7),
(23, '120.00', 0, '0,58€ / kwh pour les non abonnés.', 0, 0, 1, 0, 0, 7),
(24, '22.00', 0, '0,32 €/kWh', 0, 1, 0, 0, 0, 8),
(25, '7.40', 0, '0,40', 1, 1, 0, 0, 0, 9),
(26, '22.00', 0, '15', 0, 1, 0, 0, 1, 10),
(27, '7.40', 0, '10 € tarif de départ. Des frais supplémentaires peuvent s\'appliquer ', 1, 1, 0, 0, 0, 11),
(28, '22.00', 0, '0,36 €/kWh', 1, 1, 0, 0, 0, 12),
(29, '22.00', 0, '0,32 €/kWh', 1, 1, 0, 0, 0, 13),
(30, '22.00', 0, '0.54€ / kwh', 0, 1, 0, 0, 0, 14);

-- --------------------------------------------------------

--
-- Structure de la table `Station`
--

CREATE TABLE `Station` (
  `id_station` int(11) NOT NULL,
  `nom_station` varchar(150) NOT NULL,
  `adresse_station` varchar(200) NOT NULL,
  `implantation_station` varchar(50) NOT NULL,
  `nbre_pdc` int(11) NOT NULL,
  `condition_acces` varchar(30) NOT NULL,
  `horaires` varchar(250) NOT NULL,
  `consolidated_longitude` decimal(10,6) NOT NULL,
  `consolidated_latitude` decimal(10,6) NOT NULL,
  `code_departement` varchar(8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Contenu de la table `Station`
--

INSERT INTO `Station` (`id_station`, `nom_station`, `adresse_station`, `implantation_station`, `nbre_pdc`, `condition_acces`, `horaires`, `consolidated_longitude`, `consolidated_latitude`, `code_departement`) VALUES
(1, 'Hippodrome', '1 Chemin des courses 31100 Toulouse', 'Voirie', 6, 'Accès libre', '24/7', '1.403325', '43.591239', '31'),
(2, 'Brasserie Stade Toulousain', '114 Rue des Troènes 31200 Toulouse', 'Parking privé à usage public', 9, 'Accès libre', 'Mo-Sun 09:00-21:00', '1.413705', '43.621588', '31'),
(3, 'Golf de Garonne', '5 Allee Charles Gandia 31100 Toulouse', 'Parking public', 8, 'Accès libre', 'Mo-Su 08:00-19:00', '1.407644', '43.628261', '31'),
(4, 'Montestruc', 'Rue du 19 mars 1962 32390 Montestruc', 'Parking public', 8, 'Accès libre', '24/7', '0.628264', '43.792972', '32'),
(5, 'EvBox DC', '34 Rue Pasteur 69Bordeaux', 'Station dédiée à la recharge rapide', 2, 'Accès libre', '24/7', '4.840000', '45.790000', '69'),
(6, 'Allego - Au Bureau Soissons', 'Rue du sentier', 'Station dédiée à la recharge rapide', 2, 'Accès libre', '24/7', '3.307154', '49.364948', '02'),
(7, 'MANIERE FIOUL AVIA', '1119 route de sainte fereole, 19360 Malemort, ', 'Station dédiée à la recharge rapide', 2, 'Accès libre', '24/7', '1.575868', '45.181907', '19'),
(8, 'Technopole Arbois', 'Avenue Louis Philibert 13290 Aix-en-Provence', 'Station dédiée à la recharge rapide', 13, 'Accès libre', 'Mo-Fr 08:00-20:00', '5.329331', '43.491310', '13'),
(9, 'gite danse des etoiles', '330 route de Chagny 71520 SAINT-POINT', 'Parking privé réservé à la clientèle', 3, 'Accès réservé', '24/7', '4.610000', '46.340000', '71'),
(10, 'parking', 'bd jean brisseau', 'Parking privé réservé à la clientèle', 1, 'Accès libre', '24/7', '0.182259', '44.677127', '47'),
(11, 'TOULOUSE AEROPORT HOTEL ', '16, av escadrille normandie niémen 31700 BLAGNAC', 'Parking privé réservé à la clientèle', 2, 'Accès réservé', '24/7', '1.394000', '43.632800', '31'),
(12, 'Camping Les Places Dorées - 85160 Saint-Jean-de-Monts', '248 Rue de Notre Dame, 85160 Saint-Jean-de-Monts', 'Parking privé réservé à la clientèle', 2, 'Accès réservé', '24/7', '-2.110035', '46.810206', '85'),
(13, 'IMORIZON ANCENIS - MERMOZ 2 ANCENIS', '29 Rue Guynemer 44150 ANCENIS', 'Parking privé réservé à la clientèle', 2, 'Accès libre', '24/7', '-1.189133', '47.407691', '44'),
(14, 'BASTIDE FANGOUSE', '284 chemin de la Marouine', 'Parking privé réservé à la clientèle', 2, 'Accès libre', 'Mo-Su 08:00-18:00', '6.225168', '43.497252', '83');

--
-- Index pour les tables exportées
--

--
-- Index pour la table `departement`
--
ALTER TABLE `departement`
  ADD PRIMARY KEY (`code_departement`);

--
-- Index pour la table `point_de_charge`
--
ALTER TABLE `point_de_charge`
  ADD PRIMARY KEY (`id_point_charge`),
  ADD KEY `point_de_charge_id_station_FK` (`id_station`);

--
-- Index pour la table `Station`
--
ALTER TABLE `Station`
  ADD PRIMARY KEY (`id_station`),
  ADD KEY `Station_code_departement_FK` (`code_departement`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `point_de_charge`
--
ALTER TABLE `point_de_charge`
  MODIFY `id_point_charge` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;
--
-- AUTO_INCREMENT pour la table `Station`
--
ALTER TABLE `Station`
  MODIFY `id_station` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `point_de_charge`
--
ALTER TABLE `point_de_charge`
  ADD CONSTRAINT `point_de_charge_id_station_FK` FOREIGN KEY (`id_station`) REFERENCES `Station` (`id_station`);

--
-- Contraintes pour la table `Station`
--
ALTER TABLE `Station`
  ADD CONSTRAINT `Station_code_departement_FK` FOREIGN KEY (`code_departement`) REFERENCES `departement` (`code_departement`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
