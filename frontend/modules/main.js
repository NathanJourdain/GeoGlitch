import globals from './config.js';
import { initMap } from './mapbox.js';
import { hangUpCall } from './webrtc.js';
import { openWebSocket } from './websocket.js';

/**
 * Point d'entrée principal.
 */
async function init() {
  initMap();
  
  globals.username = await requestUsername();
  
  if (!globals.username) {
    console.error("Aucun nom d'utilisateur renseigné. L'application ne peut pas fonctionner.");
    return;
  }

  globals.hangUpBtn.addEventListener("click", hangUpCall);

  openWebSocket(globals.username);

  // Raccrocher l'appel si l'utilisateur ferme la fenêtre
  globals.modalVisio.addEventListener('close', (event) => {
    hangUpCall();
  });
  
}

/**
 * Demande le nom d'utilisateur tant qu'il n'est pas renseigné.
 * @returns {Promise<string>} Le nom d'utilisateur
 */
function requestUsername() {
  return new Promise((resolve) => {
    globals.requestUsernameForm.addEventListener('submit', function(event) {
      event.preventDefault();
      const username = globals.usernameInput.value.trim();
      if (username) {

        // envoyer via sendNewClient et attendre la réponse
        sendNewClient(username)
        .then(response => {
          if (response.ok) {
            globals.requestUsernameForm.style.display = 'none';
            resolve(username);
          } else {
            alert("Le nom d'utilisateur est déjà pris. Veuillez en choisir un autre.");
          }
        })

      }
    });
  });
}

/**
 * Appelle l'endpoint pour enregistrer un nouvel utilisateur.
 * @param {string} username
 * @returns {Promise<Response>}
 */
function sendNewClient(username) {
  return fetch("/api/client", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
}


// Point d'entrée
document.addEventListener("DOMContentLoaded", init); 