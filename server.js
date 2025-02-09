const express = require("express");
const https = require("https");
const WebSocket = require("ws");
const fs = require("fs");
const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/kylian.lemarois.caen.mds-project.fr/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/kylian.lemarois.caen.mds-project.fr/fullchain.pem",
  "utf8"
);
const credentials = { key: privateKey, cert: certificate };

const app = express();
const server = https.createServer(credentials, app);
const wss = new WebSocket.Server({ server });
let connected = [];
app.use(express.static("public"));
wss.on("connection", (ws) => {
  console.log("Nouveau client connecté");
  ws.on("message", (message) => {
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.log("Erreur lors de l'analyse du message:", err);
      ws.send(JSON.stringify({ type: "error", message: "JSON invalide" }));
      return;
    }
    ws.send(JSON.stringify(ws));
    switch (data.type) {
      case "connexion":
        if (!data.data || typeof data.data !== "string") {
          ws.send(
            JSON.stringify({ type: "error", message: "Nom d'utilisateur invalide." })
          );
          return;
        }

        const existingUser = connected.find(
          (client) => client.username === data.data
        );
        if (existingUser) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Nom d'utilisateur déjà pris.",
            })
          );
          return;
        }

        connected.push({ username: data.data, ws: ws })
        console.log(`Utilisateur connecté: ${data.data}`);
        break
      case "message":
      case "gps":
        connected.forEach((client) => {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(data));
          }
        });
        break
      case "offer":
      case "answer":
      case "candidate":
        const targetUsername = data.target;
        const senderUsername = data.sender;

        if (!targetUsername || !senderUsername) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Données de signalisation invalides.",
            })
          );
          return;
        }

        if (targetUsername === senderUsername) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Vous ne pouvez pas vous connecter à vous-même.",
            })
          );
          return;
        }

        const targetClient = connected.find(
          (client) => client.username === targetUsername
        );

        if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
          targetClient.ws.send(
            JSON.stringify({
              type: data.type,
              offer: data.offer,
              answer: data.answer,
              candidate: data.candidate,
              sender: senderUsername,
            })
          );
        } else {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Utilisateur ${targetUsername} introuvable ou non connecté.`,
            })
          );
        }
        break
      default:
        console.log("Type de message non pris en charge:", data.type);
        break
    }
  });
  ws.on("close", (ws) => {
    console.log("Client déconnecté");
    connected = connected.filter(item => item.ws !== ws)
  });
});
server.listen(8080, () => {
  console.log("Serveur en écoute sur https://kylian.lemarois.caen.mds-project.fr:8080");
});

