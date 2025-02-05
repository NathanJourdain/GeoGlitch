import globals from './config.js';
import { sendToServer } from './websocket.js';

/**
 * Lance un appel vers un utilisateur cible.
 * @param {string} userToCall
 */
export async function startCall(userToCall) {
  if (globals.peerConnection) {
    alert("Vous avez déjà un appel en cours !");
    return;
  }

  globals.targetUsername = userToCall;
  createPeerConnection();

  try {
    const stream = await navigator.mediaDevices.getUserMedia(globals.MEDIA_CONSTRAINTS);
    localVideo.srcObject = stream;
    stream.getTracks().forEach((track) => globals.peerConnection.addTrack(track, stream));

    globals.modalVisio.showModal();

    globals.modalVisio.querySelector("h3").textContent = `En attente de ${globals.targetUsername}...`;

  } catch (error) {
    handleGetUserMediaError(error);
  }
}

/**
 * Gestion de la fermeture de l'appel vidéo
 * si l'utilisateur cible a quitté la page.
 * @param {{ username: string }} message
 */
export async function handleRemoveClient({ username }) {
  if (username === globals.targetUsername) {
    closeVideoCall();
  }
}


/**
 * Crée la RTCPeerConnection et configure ses événements.
 */
function createPeerConnection() {
  globals.peerConnection = new RTCPeerConnection(globals.STUN_CONFIG);

  globals.peerConnection.onicecandidate = handleICECandidateEvent;
  globals.peerConnection.ontrack = handleTrackEvent;
  globals.peerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
  globals.peerConnection.onremovetrack = handleRemoveTrackEvent;
  globals.peerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  globals.peerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  globals.peerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
}

/**
 * Gestion des erreurs lors de la récupération du flux caméra/micro.
 * @param {Error} e
 */
function handleGetUserMediaError(e) {
  switch (e.name) {
    case "NotFoundError":
      alert("Aucune caméra ou microphone n'a été trouvé.");
      break;
    case "SecurityError":
    case "PermissionDeniedError":
      // L'utilisateur a refusé la permission.
      break;
    default:
      alert(`Erreur lors de l'ouverture de la caméra/micro : ${e.message}`);
      break;
  }
  closeVideoCall();
}

/**
 * Crée et envoie l'offre (SDP) vers l'utilisateur cible.
 */
function handleNegotiationNeededEvent() {
  globals.peerConnection
    .createOffer()
    .then((offer) => globals.peerConnection.setLocalDescription(offer))
    .then(() => {
      sendToServer({
        name: globals.username,
        target: globals.targetUsername,
        type: "video-offer",
        sdp: globals.peerConnection.localDescription,
      });
    })
    .catch((err) => console.error("Erreur lors de la négociation:", err));
}

/**
 * Réception d'une offre "video-offer" : on répond par une "video-answer".
 * @param {{ sender: string, sdp: RTCSessionDescription }} msg
 */
export function handleVideoOfferMsg(msg) {
  let localStream = null;
  globals.targetUsername = msg.sender;

  // demander à l'utilisateur si il veut se connecter à targetUsername
  if (!confirm(`Voulez-vous répondre à ${globals.targetUsername} ?`)) {
    sendToServer({
      name: globals.username,
      target: globals.targetUsername,
      type: "hang-up",
    });
    return;
  }

  createPeerConnection();

  const desc = new RTCSessionDescription(msg.sdp);

  globals.peerConnection
    .setRemoteDescription(desc)
    .then(() => navigator.mediaDevices.getUserMedia(globals.MEDIA_CONSTRAINTS))
    .then((stream) => {
      localStream = stream;
      globals.localVideo.srcObject = localStream;
      
      globals.modalVisio.showModal();

      globals.modalVisio.querySelector("h3").textContent = `Appel avec ${globals.targetUsername}`;

      localStream
        .getTracks()
        .forEach((track) => globals.peerConnection.addTrack(track, localStream));
    })
    .then(() => globals.peerConnection.createAnswer())
    .then((answer) => globals.peerConnection.setLocalDescription(answer))
    .then(() => {
      sendToServer({
        name: globals.username,
        target: globals.targetUsername,
        type: "video-answer",
        sdp: globals.peerConnection.localDescription,
      });
    })
    .catch(handleGetUserMediaError);
}

/**
 * Réception d'une réponse "video-answer" : on met à jour la description distante.
 * @param {{ sdp: RTCSessionDescription }} msg
 */
export function handleVideoAnswerMsg(msg) {
  const desc = new RTCSessionDescription(msg.sdp);
  globals.peerConnection.setRemoteDescription(desc).catch(console.error);
}

/**
 * Gestion d'un nouveau candidat ICE (envoyé par l'autre pair).
 * @param {{ candidate: RTCIceCandidate }} msg
 */
export function handleNewICECandidateMsg(msg) {
  const candidate = new RTCIceCandidate(msg.candidate);
  globals.peerConnection?.addIceCandidate(candidate).catch(console.error);
}

/**
 * Envoi d'un nouveau candidat ICE vers le serveur.
 * @param {RTCPeerConnectionIceEvent} event
 */
function handleICECandidateEvent(event) {
  if (event.candidate) {
    sendToServer({
      type: "new-ice-candidate",
      target: globals.targetUsername,
      candidate: event.candidate,
    });
  }
}

/**
 * Quand on reçoit une piste vidéo/audio.
 * @param {RTCTrackEvent} event
 */
function handleTrackEvent(event) {
  if (globals.remoteVideo.srcObject !== event.streams[0]) {
    globals.remoteVideo.srcObject = event.streams[0];
  }

  globals.modalVisio.querySelector("h3").textContent = `Appel avec ${globals.targetUsername}`;
}

/**
 * Quand une piste est retirée (fin de stream).
 * @param {RTCTrackEvent} event
 */
function handleRemoveTrackEvent(event) {
  const stream = globals.remoteVideo.srcObject;
  if (!stream) return;

  const trackList = stream.getTracks();
  if (trackList.length === 0) {
    closeVideoCall();
  }
}

/**
 * Ferme proprement l'appel vidéo en cours (côté local).
 */
export function hangUpCall() {

  if(!globals.targetUsername) {
    return;
  }

  sendToServer({
    name: globals.username,
    target: globals.targetUsername,
    type: "hang-up",
  });
  closeVideoCall();
}

/**
 * Ferme et nettoie la connexion WebRTC et les flux.
 */
export function closeVideoCall() {

  if (globals.peerConnection) {
    globals.peerConnection.ontrack = null;
    globals.peerConnection.onremovetrack = null;
    globals.peerConnection.onremovestream = null;
    globals.peerConnection.onicecandidate = null;
    globals.peerConnection.oniceconnectionstatechange = null;
    globals.peerConnection.onsignalingstatechange = null;
    globals.peerConnection.onicegatheringstatechange = null;
    globals.peerConnection.onnegotiationneeded = null;

    if (globals.remoteVideo.srcObject) {
      globals.remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
    }
    if (globals.localVideo.srcObject) {
      globals.localVideo.srcObject.getTracks().forEach((track) => track.stop());
    }

    globals.peerConnection.close();
    globals.peerConnection = null;
  }

  globals.remoteVideo.removeAttribute("src");
  globals.remoteVideo.removeAttribute("srcObject");
  globals.localVideo.removeAttribute("src");
  globals.localVideo.removeAttribute("srcObject");

  globals.targetUsername = null;
  globals.modalVisio.close();
}

/**
 * Surveille l'état de la connexion ICE.
 * @param {Event} event
 */
function handleICEConnectionStateChangeEvent(event) {
  if (!globals.peerConnection) return;
  switch (globals.peerConnection.iceConnectionState) {
    case "closed":
    case "failed":
      closeVideoCall();
      break;
    default:
      // On peut gérer d'autres états si besoin
      break;
  }
}

/**
 * Surveille l'état de la signalisation.
 * @param {Event} event
 */
function handleSignalingStateChangeEvent(event) {
  if (!globals.peerConnection) return;
  if (globals.peerConnection.signalingState === "closed") {
    closeVideoCall();
  }
}

/**
 * Surveille l'état de la collecte de candidats ICE.
 * @param {Event} event
 */
function handleICEGatheringStateChangeEvent(event) {
  // Possibilité de gérer les différents états (new, gathering, complete) 
  // pour des logs plus précis ou des actions spécifiques.
} 