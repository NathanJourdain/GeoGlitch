const globals = {
  WEB_SOCKET_URL: "wss://nathan.jourdain.caen.mds-project.fr/",
  // WEB_SOCKET_URL: "ws://localhost:8080/",
  STUN_CONFIG: {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  },
  MEDIA_CONSTRAINTS: {
    audio: true,
    video: true,
  },
  MAPBOX_ACCESS_TOKEN: "pk.eyJ1IjoibmF0aGFuamRldiIsImEiOiJjbTZzYmZrNnQwNWs2MmxzMmwycDk2dTZnIn0.ucI6aR61u8lMI_-4yDQ8JA",
  username: null,
  socket: null,
  markers: {},
  peerConnection: null,
  localStream: null,
  targetUsername: null,
  iceCandidatesQueue: [],
  modalVisio: document.querySelector(".video-container"),
  localVideo: document.querySelector("#localVideo"),
  remoteVideo: document.querySelector("#remoteVideo"),
  requestUsernameForm: document.querySelector(".request-username-form"),
  usernameInput: document.querySelector("#username"),
  hangUpBtn: document.querySelector("#hangupBtn"),
  notificationsContainer: document.querySelector(".notifications-container"),
  map: null,
}

export default globals;