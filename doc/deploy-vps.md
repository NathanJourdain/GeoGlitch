# Déploiement sur VPS Debian

Ce guide vous accompagne dans l'installation et la configuration de votre application GeoGlitch sur un VPS Debian. Nous verrons comment mettre à jour le système, installer Git, Nginx, nvm, Node.js (et npm) ainsi que pm2 pour gérer l'application en production.

---

## 1. Prérequis

- **Accès SSH** : Vous devez pouvoir vous connecter en SSH à votre VPS avec un utilisateur disposant des droits `sudo`.
- **Nom de domaine** : Il est nécessaire de disposer d’un nom de domaine pointant vers l’adresse IP de votre VPS.
- **Droits administrateur** : Certaines opérations nécessitent des droits root ou sudo.

---

## 2. Mise à jour du système

Avant toute installation, assurez-vous que votre système est à jour :

```bash
sudo apt update
sudo apt upgrade -y
```

## 3. Installation de Git
Git est indispensable pour cloner votre dépôt contenant l'intégralité du code de l'application. Pour l'installer, exécutez :

```bash
sudo apt install git -y
```

Vous pouvez vérifier l'installation avec :
```bash
git --version
```

## 4. Installation de Nginx
Nginx sera utilisé en reverse proxy pour rediriger le trafic HTTP/HTTPS vers votre application Node.js.
```bash
sudo apt install nginx -y
```

Vérifiez que Nginx fonctionne correctement :
```bash
sudo systemctl status nginx
```

## 5. Installation de nvm, Node.js et npm
Nous utiliserons nvm (Node Version Manager) pour installer et gérer la version de Node.js. Node.js inclut npm, le gestionnaire de paquets.

Installer nvm :
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
```

Après l’installation, rechargez votre profil (ou déconnectez-vous/reconnectez-vous) :
```bash
source ~/.bashrc
```

Installer la version LTS de Node.js (par exemple, la version LTS actuelle) :
```bash
nvm install --lts
```

Vous pouvez vérifier l’installation :
```bash
node -v
npm -v
```

## 6. Installation de pm2
pm2 est un gestionnaire de processus qui vous permettra de faire tourner votre application en arrière-plan et de la relancer automatiquement en cas de redémarrage du serveur.
```bash
npm install -g pm2
```

Configurez pm2 pour démarrer au démarrage du système :
```bash
pm2 startup
```
Note : Une commande vous sera affichée (avec sudo et un chemin spécifique). Exécutez-la pour activer le démarrage automatique.

## 7. Déploiement de l'application
a. Clonage du dépôt Git
Clonez votre dépôt contenant l’intégralité du code (frontend et backend) dans un répertoire de votre choix, par exemple dans /var/www/geoglitch :

```bash
sudo git clone <repository-url> /var/www/geoglitch
cd /var/www/geoglitch
```

b. Installation des dépendances
Installez les dépendances Node.js de votre projet :
```bash
npm install
```

c. Configuration de l'application
Vérifiez et éditez le fichier de configuration (`frontend/modules/config.js`) afin de renseigner les variables nécessaires :
```env
MAPBOX_ACCESS_TOKEN : Votre token Mapbox.
WEB_SOCKET_URL : L’URL du serveur WebSocket (souvent http://votredomaine.com ou http://localhost:3000 selon le contexte).
```

d. Démarrage de l'application avec pm2
Lancez votre serveur Node.js via pm2 pour qu’il s’exécute en arrière-plan :
```bash
pm2 start server.js --name geoglitch
pm2 save
```

Vous pouvez consulter les logs de votre application avec :
```bash
pm2 logs geoglitch
```

## 8. Configuration de Nginx en tant que Reverse Proxy
Pour que votre application soit accessible via votre domaine ou IP publique, configurez Nginx pour rediriger les requêtes HTTP/HTTPS vers le port utilisé par votre application (ici, supposons le port 3000).

Créer un fichier de configuration Nginx
Créez un nouveau fichier, par exemple /etc/nginx/sites-available/geoglitch :

```nginx
server {
    listen 80;
    server_name votredomaine.com;  # Remplacez par votre nom de domaine ou utilisez l'IP publique

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activer la configuration
Créez un lien symbolique vers le dossier sites-enabled :

```bash
sudo ln -s /etc/nginx/sites-available/geoglitch /etc/nginx/sites-enabled/
```

Tester et recharger Nginx

Vérifiez la configuration :

```bash
sudo nginx -t
```

Puis rechargez Nginx pour appliquer les modifications :
```bash
sudo systemctl reload nginx
```

## 9. Installation d’un Certificat SSL
Pour sécuriser vos connexions (obligatoire pour la géolocalisation et WebRTC en production), vous pouvez installer un certificat SSL avec Certbot.

Installer Certbot pour Nginx :

```bash
sudo apt install certbot python3-certbot-nginx -y
```

Obtenir et installer le certificat SSL :
```bash
sudo certbot --nginx -d votredomaine.com
```

Suivez les instructions à l’écran pour finaliser la configuration et activer le renouvellement automatique.
