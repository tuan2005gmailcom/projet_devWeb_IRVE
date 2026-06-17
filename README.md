# IRVE Data Explorer - README

## 1. Présentation du projet

Ce projet est un petit site web qui permet d’explorer des données de bornes de recharge électrique.

Le site utilise :

- HTML
- CSS
- JavaScript
- PHP
- MySQL
- Python

Les données sont stockées dans une base MySQL.
Les pages web récupèrent les données avec PHP.
Les modèles IA sont lancés avec des scripts Python.

---

## 2. Pages principales

Le projet contient plusieurs pages :

```text
index.html
stats.html
visualisation.html
cluster.html
implantation.html
puissance.html
```

- `index.html` : page d’accueil
- `stats.html` : statistiques des stations
- `visualisation.html` : carte et liste des stations
- `cluster.html` : résultat du clustering
- `implantation.html` : prédiction du type d’implantation
- `puissance.html` : prédiction de puissance

---

## 3. Organisation des dossiers

```text
irve-data-explorer-html/ 
├── assets/ 
│ ├── css/ 
│ │ └── style.css 
│ │ 
│ └── js/ 
│ 	├── cluster_ai_snippet.js 
│ 	├── prediction_implantation.js 
│ 	├── prediction_puissance.js 
│ 	├── script.js 
│ 	├── stats_db.js 
│ 	└── visualisation_db.js 
│ 
├── base de donnees/ 
│ ├── ct_dinh.sql
│ 
├── php/ 
│ ├── api_stations.php 
│ ├── config_db.php 
│ ├── predict_cluster.php 
│ ├── predict_implantation.php 
│ ├── predict_puissance.php 
│ └── visualisation.php 
│ 
├── python/ 
│ ├── clustering/ 
│ │ ├── clusters_map_web.py 
│ │ ├── cluster_model.pkl 
│ │ └── scaler.pkl 
│ │ 
│ ├── implantation/ 
│ │ ├── features_implantation.pkl 
│ │ ├── implantation.py 
│ │ ├── label_encoder_implantation.pkl 
│ │ ├── model_implantation_gradientboost.pkl 
│ │ ├── model_implantation_logisticregression.pkl 
│ │ ├── model_implantation_randomforest.pkl 
│ │ └── model_implantation_XGBoost.pkl 
│ │ 
│ └── puissance/ 
│ 	├── decision_tree_puissance.pkl 
│ 	├── linear_regression_puissance.pkl 
│ 	├── model_config.pkl 
│ 	├── puissance.py 
│ 	└── random_forest_puissance.pkl 
│ 
├── cluster.html 
├── implantation.html 
├── index.html 
├── puissance.html 
├── stats.html 
└── visualisation.html
```

Le dossier `assets` contient le CSS et le JavaScript.
Le dossier `php` contient les fichiers pour communiquer avec la base de données et avec Python.
Le dossier `python` contient les scripts Python et les modèles `.pkl`.

---

## 4. Installation sur le serveur

Il faut mettre le dossier du projet dans le dossier web du serveur.

Exemple général :

```text
/chemin/du/serveur/irve-data-explorer-html/
```

Ensuite, on peut ouvrir le site avec une URL du type :

```text
https://votre-serveur/irve-data-explorer-html/index.html
```

Le nom exact du serveur dépend de l’environnement utilisé.

---

## 5. Configuration de la base de données

La configuration MySQL se trouve dans :

```text
php/config_db.php
```

Il faut modifier les informations suivantes :

```php
define('DB_USER', "votre_utilisateur");
define('DB_PASSWORD', "votre_mot_de_passe");
define('DB_NAME', "votre_base");
define('DB_SERVER', "127.0.0.1");
```

Si la base MySQL n’est pas sur le même serveur, il faut changer `DB_SERVER`.

---

## 6. Tables utilisées

Le projet utilise principalement trois tables :

```text
departement
Station
point_de_charge
```

La table `departement` contient les départements.
La table `Station` contient les informations générales des stations.
La table `point_de_charge` contient les informations des prises et puissances.

Les pages `stats.html` et `visualisation.html` récupèrent les données avec :

```text
php/api_stations.php
```

---

## 7. Installation Python

Les scripts Python utilisent plusieurs bibliothèques.
Depuis le dossier du projet, on peut installer les dépendances avec :

```bash
python3 -m pip install --user pandas numpy scikit-learn joblib xgboost folium
```

Les modèles IA sont déjà sauvegardés dans des fichiers `.pkl`.

---

## 8. Fichiers Python importants

### Clustering

```text
python/clustering/clusters_map_web.py
python/clustering/cluster_model.pkl
python/clustering/scaler.pkl
```

### Implantation

```text
python/implantation/implantation.py
python/implantation/model_implantation_randomforest.pkl
python/implantation/model_implantation_gradientboost.pkl
python/implantation/model_implantation_XGBoost.pkl
python/implantation/model_implantation_logisticregression.pkl
python/implantation/label_encoder_implantation.pkl
python/implantation/features_implantation.pkl
```

### Puissance

```text
python/puissance/puissance.py
python/puissance/random_forest_puissance.pkl
python/puissance/decision_tree_puissance.pkl
python/puissance/linear_regression_puissance.pkl
python/puissance/model_config.pkl
```

---

## 9. Configuration de Python dans PHP

Dans les fichiers PHP qui lancent Python, il y a une ligne comme :

```php
$python = "python3";
```

Si Python n’est pas trouvé, il faut mettre le chemin complet vers Python.

Exemple :

```php
$python = "/usr/bin/python3";
```

Les fichiers concernés sont :

```text
php/predict_cluster.php
php/predict_implantation.php
php/predict_puissance.php
```

---

## 10. Tests rapides

### Tester la base de données

Ouvrir :

```text
https://votre-serveur/irve-data-explorer-html/php/api_stations.php
```

Si tout marche, on doit voir un JSON avec :

```json
"success": true
```

### Tester le cluster

```text
php/predict_cluster.php?lat=48.8566&lon=2.3522
```

### Tester l’implantation

```text
php/predict_implantation.php?lat=48.8566&lon=2.3522&nbre_pdc=4&puissance_nominale=22&condition_acces=Accès libre
```

### Tester la puissance

```text
php/predict_puissance.php?lat=48.8566&lon=2.3522&nbre_pdc=4&implantation_station=Voirie&condition_acces=Accès libre
```

---

## 11. Problèmes possibles

Si les données ne s’affichent pas :

- vérifier `php/config_db.php`
- vérifier que MySQL fonctionne
- vérifier que les tables existent
- ouvrir `php/api_stations.php`

Si une prédiction ne marche pas :

- vérifier que Python est installé
- vérifier que les bibliothèques Python sont installées
- vérifier que les fichiers `.pkl` sont au bon endroit
- vérifier les erreurs dans la console du navigateur

Pour voir les erreurs dans le navigateur :

```text
F12 > Console
```

Si les changements ne s’affichent pas, faire :

```text
Ctrl + F5
```

---

## 12. Résumé

Pour lancer le projet, il faut :

1. mettre le dossier sur le serveur ;
2. configurer `php/config_db.php` ;
3. vérifier que la base MySQL contient les données ;
4. installer les bibliothèques Python ;
5. vérifier que les modèles `.pkl` sont dans les bons dossiers ;
6. ouvrir `index.html`.

Le projet est prêt quand :

- les statistiques s’affichent ;
- la carte affiche les stations ;
- les pages de prédiction retournent un résultat.
