import globals from './config.js';
import * as GeoService from './geolocation.js';
import * as MapService from './mapbox.js';
import * as WebRTCService from './webrtc.js';
import * as ChatService from './chat.js';

/**
 * Ouvre la connexion WebSocket et attache les écouteurs d'événements.
 * @param {string} username
 */
export function openWebSocket(username) {
  globals.socket = new WebSocket(`${globals.WEB_SOCKET_URL}?username=${encodeURIComponent(username)}`);

  globals.socket.addEventListener("open", handleWebSocketOpen);
  globals.socket.addEventListener("message", handleWebSocketMessage);
  globals.socket.addEventListener("error", (error) => console.error("Socket Error:", error));
  globals.socket.addEventListener("close", () => console.log("Socket closed"));
}

/**
 * Gestion de l'événement "open" du WebSocket.
 */
function handleWebSocketOpen() {
  GeoService.initGeolocationWatcher();
}

/**
 * Gestion des messages reçus depuis le WebSocket.
 * @param {MessageEvent} event
 */
async function handleWebSocketMessage(event) {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch (err) {
    console.error("Impossible de parser le message JSON :", err);
    return;
  }

  switch (data.type) {
    case "update-position":
      MapService.handleUpdatePosition(data);
      break;

    case "remove-client":
      MapService.handleRemoveClient(data);
      WebRTCService.handleRemoveClient(data);
      break;

    case "video-offer":
      WebRTCService.handleVideoOfferMsg(data);
      break;

    case "video-answer":
      WebRTCService.handleVideoAnswerMsg(data);
      break;

    case "new-ice-candidate":
      WebRTCService.handleNewICECandidateMsg(data);
      break;

    case "hang-up":
      WebRTCService.closeVideoCall();
      break;

    case "receive-message":
      ChatService.handleReceiveMessage(data);
      break;

    default:
      console.warn("Type de message non géré :", data.type);
  }
}

/**
 * Envoie un message sous forme JSON au serveur WebSocket.
 * @param {Object} msg
 */
export function sendToServer(msg) {
  if (!globals.socket || globals.socket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket non disponible ou fermé.");
    return;
  }
  globals.socket.send(JSON.stringify(msg));
} 