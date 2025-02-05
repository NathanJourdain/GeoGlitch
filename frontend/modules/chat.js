import globals from "./config.js";
import { sendToServer } from "./websocket.js";

/**
 * Envoyer un message à un utilisateur
 * @param {string} username Nom de l'utilisateur
 */
export async function sendMessage(username) {

    const message = prompt("Entrez votre message :");

    if (!message) {
        return;
    }

    sendToServer({
        name: globals.username,
        target: username,
        type: "send-message",
        message: message
    });

}



/**
 * Gère la réception d'un message.
 * @param {{ sender: string, message: string }} data
 */
export function handleReceiveMessage({ sender, message }) {
    console.log(`Message reçu de ${sender} : ${message}`);

    const newNotification = document.createElement("div");
    newNotification.classList.add("alert");
    newNotification.innerHTML = `<div><h3 class="font-bold">De ${sender}</h3><div class="text-xs">${message}</div></div>`;

    globals.notificationsContainer.appendChild(newNotification);
    globals.notificationsContainer.scrollTop = globals.notificationsContainer.scrollHeight;

    setTimeout(() => {
        newNotification.remove();
    }, 10000);
}


// Expose la fonction startCall globalement pour qu'elle soit accessible depuis le HTML
window.sendMessage = sendMessage; 