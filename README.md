# WebSocket Chat Application with Video Conferencing

## Code Source et Dépôt Git
Le code source de l'application est disponible dans le dépôt Git suivant :
[Maps](https://github.com/Karmapuma/Maps)

## Organisation du Code
L'application est structurée en deux parties principales :
- **Serveur** : Géré par Node.js, utilisant WebSocket pour la communication en temps réel.
- **Client** : Comprend les fichiers HTML, CSS et JavaScript pour l'interface utilisateur.

## Documentation Technique

### Architecture de l'Application
L'application utilise une architecture client-serveur où :
- **WebSocket** : Gère les connexions en temps réel entre le client et le serveur, permettant l'échange de messages et de données de géolocalisation.
- **WebRTC** : Permet la visioconférence entre les utilisateurs en établissant des connexions peer-to-peer.
- **APIs de Géolocalisation** : Utilisées pour obtenir la position de l'utilisateur et l'afficher sur une carte.

### Dépendances
Les principales dépendances de l'application sont :
- `express` : Framework web pour Node.js.
- `ws` : Bibliothèque WebSocket pour Node.js.
- `leaflet` : Bibliothèque JavaScript pour les cartes interactives.

Pour installer les dépendances, exécutez la commande suivante dans le répertoire du projet :
bash npm install


### Lancement de l'Application en Local
1. Clonez le dépôt :
   ```bash
   git clone https://github.com/Karmapuma/Maps
   cd Maps
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Modifiez vos clef dans server.js
4. Modifiez l'URL socket dans script.js
5. Lancez le serveur :
   ```bash
   node maps/server.js
   ```
6. Ouvrez votre navigateur et accédez à votre page.

### Déploiement sur VPS
Pour déployer l'application sur un VPS, assurez-vous de :
- Ouvrir le port 8080 pour les connexions WebSocket.
- Configurer SSL pour sécuriser les connexions (utilisez Let's Encrypt et certbot par exemple).

## Documentation Fonctionnelle

### Parcours Utilisateur
1. **Autorisation de la Géolocalisation** : Lors de la première connexion, l'utilisateur doit autoriser l'accès à sa position géographique.
2. **Affichage de la Position sur la Carte** : La position de l'utilisateur est affichée sur une carte (OpenStreetMap).
3. **Mise à Jour Temps Réel des Positions** : Les positions des utilisateurs sont mises à jour en temps réel via WebSocket.
4. **Démarrage d'une Visioconférence** : L'utilisateur peut démarrer une visioconférence avec d'autres utilisateurs en cliquant sur le bouton "Démarrer le Chat" sur le marqueur d'un utilisateur de la carte.
5. **Envoyer des messages** : L'utilisateur peut envoyer des messages en broadcast à tout utilisateurs connectés

### Interaction avec l'Interface
- **Rejoindre le Chat** : L'utilisateur entre son nom d'utilisateur dans la modal et clique sur "Rejoindre le chat".
- **Envoyer un Message** : L'utilisateur peut taper un message et appuyer sur "Entrée" ou cliquer sur "Envoyer".
- **Démarrer un Chat** : En cliquant sur un marqueur sur la carte, l'utilisateur peut démarrer un chat vidéo avec un autre utilisateur.

### Limites Connues et Pistes d'Amélioration
- **Multiples Utilisateurs** : L'application peut rencontrer des problèmes de performance avec un grand nombre d'utilisateurs connectés simultanément.
- **Compatibilité Navigateur** : L'application ne fonctionne actuellement que sur firefox

---

Pour toute question ou problème, n'hésitez pas à ouvrir une issue sur le dépôt Git.
