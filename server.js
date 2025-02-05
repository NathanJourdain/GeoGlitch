/********************************
 * Imports & Configuration
 ********************************/
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const url = require("url");

const app = express();
app.use(express.json());

app.use(express.static("frontend"));

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

// Liste des clients connectés
const clients = {};

/********************************
 * Routes
 ********************************/

/**
 * Route pour ajouter un nouveau client.
 * Vérifie la présence d’un username.
 */
app.post("/api/client", (req, res) => {
  const { username } = req.body;

  // Vérification de l'username
  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  // Vérification si l'utilisateur existe déjà
  if (clients[username]) {
    return res.status(409).json({ message: "Username already exists" });
  }

  // Ajout du client dans la liste (position par défaut à null)
  clients[username] = { position: null };

  console.log("Nouveau client ajouté :", username);
  return res.status(200).json({ message: "Client added successfully" });
});

/********************************
 * WebSocket : Gestion des connexions
 ********************************/
wss.on("connection", (client, req) => {
  handleNewConnection(client, req);

  // Gestion des messages et fermeture de la connexion
  client.on("message", (evt) => handleClientMessage(evt, client));
  client.on("close", () => handleConnectionClose(client));
  client.on("error", (err) => console.error("WebSocket error:", err));
});

/**
 * Gère une nouvelle connexion au serveur WebSocket.
 * Envoie immédiatement les positions de tous les clients existants
 * au nouveau client.
 *
 * @param {WebSocket} client Le WebSocket du nouveau client
 * @param {http.IncomingMessage} req La requête HTTP de connexion
 */
const handleNewConnection = (client, req) => {
  // Récupération du nom d'utilisateur
  const { username } = url.parse(req.url, true).query || {};
  if (!username || !clients[username]) {
    console.warn("Connexion refusée : username inexistant ou invalide.");
    client.close();
    return;
  }

  client.username = username;
  console.log(`Client "${client.username}" s'est connecté.`);

  // Envoi des positions de tous les clients au nouveau client
  Object.entries(clients).forEach(([existingUsername, { position }]) => {
    if (position) {
      const msg = {
        type: "update-position",
        username: existingUsername,
        data: position,
      };
      client.send(JSON.stringify(msg));
      console.log(`Envoi de la position de "${existingUsername}" au nouveau client.`);
    }
  });

  clients[username] = { 
    socket: client
  };
};

/**
 * Gère les messages reçus depuis un client.
 *
 * @param {string} eventData Les données reçues du client
 * @param {WebSocket} client Le client émetteur du message
 */
const handleClientMessage = (eventData, client) => {
  let data;
  try {
    data = JSON.parse(eventData);
  } catch (err) {
    console.error("Erreur de parsing JSON:", err);
    return;
  }

  switch (data.type) {
    case "update-position":
      updatePosition(data, client);
      break;

    case "video-offer":
    case "video-answer":
    case "new-ice-candidate":
      // Relayer les messages de signalisation au destinataire cible
      target = data.target;

      if (target && clients[target] && clients[target].socket) {
        const targetClient = clients[target].socket;
        targetClient.send(JSON.stringify({ 
          type: data.type, 
          sdp: data.sdp, 
          candidate: data.candidate, 
          sender: client.username 
        }));
      } else {
        console.warn(`Cible introuvable ou non connectée : ${target}`);
      }
      break;
    case "hang-up":
      // Relayer le message de raccrochage à l'autre utilisateur
      target = data.target;

      if (target && clients[target] && clients[target].socket) {
        const targetClient = clients[target].socket;
        targetClient.send(JSON.stringify({ type: "hang-up", sender: client.username }));
      } else {
        console.warn(`Cible introuvable ou non connectée : ${target}`);
      }
      break;

    case "send-message":
      // Relayer le message à l'utilisateur cible
      target = data.target;

      console.log(data);

      if (target && clients[target] && clients[target].socket) {
        const targetClient = clients[target].socket;
        targetClient.send(JSON.stringify({ 
          type: "receive-message", 
          sender: client.username, 
          message: data.message 
        }));
      } else {
        console.warn(`Cible introuvable ou non connectée : ${target}`);
      }
      break;

    default:
      console.warn(`Type de message non pris en charge : ${data.type}`);
  }
};


/**
 * Gère la fermeture de la connexion d'un client.
 *
 * @param {WebSocket} client Le client qui se déconnecte
 */
const handleConnectionClose = (client) => {
  if (!client.username) {
    return;
  }

  console.log(`Client "${client.username}" s'est déconnecté.`);

  // Supprimer le client de la liste
  delete clients[client.username];

  // Annoncer la déconnexion à tous les clients
  broadcastMessage({
    type: "remove-client",
    username: client.username,
  });

  // Ici vous pouvez effectuer d’autres actions (sauvegarde, logs, etc.)
};

/********************************
 * Fonctions Utilitaires
 ********************************/

/**
 * Mets à jour la position d'un client et la diffuse à tous.
 *
 * @param {object} data Objet contenant type, username, data (position)
 * @param {WebSocket} client
 */
const updatePosition = (data, client) => {
  const { username, data: position } = data;

  // Vérification
  if (!username || !clients[username]) {
    console.error("update-position : username introuvable ou non valide.");
    return;
  }
  if (!position) {
    console.error("update-position : position invalide.");
    return;
  }

  // Mise à jour de la position
  clients[username].position = position;

  // Diffusion à tous les clients
  broadcastMessage({
    type: "update-position",
    username,
    data: position,
  });

  console.log(`Position mise à jour pour "${username}" :`, position);
};

/**
 * Envoie un message à tous les clients connectés.
 *
 * @param {object} message Le message à envoyer (sera converti en JSON)
 */
const broadcastMessage = (message) => {
  const msgString = JSON.stringify(message);
  wss.clients.forEach((wsClient) => {
    if (wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(msgString);
    }
  });
};

/********************************
 * Démarrage du serveur
 ********************************/
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://localhost:${PORT}`);
});
