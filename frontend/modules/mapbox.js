import globals from './config.js';
import { startCall } from './webrtc.js';

/**
 * Initialise la carte Mapbox avec des paramètres prédéfinis.
 */
export function initMap() {
  mapboxgl.accessToken = globals.MAPBOX_ACCESS_TOKEN;
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v11", // Pour un fond clair
    center: [2.213749, 46.227638], // Coordonnées du centre de la France
    zoom: 4, // Niveau de zoom
  });

  globals.map = map;
}

/**
 * Gère la mise à jour de la position d'un utilisateur.
 * @param {{ username: string, data: { latitude: number, longitude: number }}} message
 */
export function handleUpdatePosition({ username, data }) {
  if (!data) {
    console.error("Données de position invalides");
    return;
  }

  const { latitude, longitude, speed } = data;
  
  // Crée le marker pour cet utilisateur
  const marker = createOrUpdateMarker(username, [longitude, latitude], speed);
  globals.markers[username] = marker;

}

/**
 * Gère la suppression d'un utilisateur (et de son marker).
 * @param {{ username: string }} message
 */
export function handleRemoveClient({ username }) {
  const marker = globals.markers[username];
  if (marker) {
    marker.remove();
    delete globals.markers[username];
    console.log("Suppression du marker de", username);
  }
}

/**
 * Crée un nouveau marker sur la map.
 * @param {string} username Nom d'utilisateur
 * @param {[number, number]} lngLat Coordonnées GPS [longitude, latitude]
 * @param {number} speed Vitesse de déplacement en m/s
 * @returns {mapboxgl.Marker}
 */
function createOrUpdateMarker(username, lngLat, speed) {

  const speedKmH = (speed ?? 0) * 3.6;

  const popupContent = `
    <div class="p-4 bg-white">
      <h3 class="text-xl font-bold mb-2">${username}</h3>
      <p class="text-sm mb-2">Vitesse : ${speedKmH.toFixed(2)} km/h</p>

      <div class="flex items-center mb-2 gap-2 flex-wrap">
        <button onclick="window.startCall('${username}')" class="btn btn-sm btn-primary" ${username === globals.username ? 'disabled' : ''}>
          Appeler
        </button>
        <button onclick="window.sendMessage('${username}')" class="btn btn-sm" ${username === globals.username ? 'disabled' : ''}>
          Message
        </button>
      </div>
    </div>
  `;

  if (globals.markers[username]) {
    console.log("Mise à jour du marker pour", username)
    return globals.markers[username]
      .setLngLat(lngLat)
      .setPopup(new mapboxgl.Popup().setHTML(popupContent));
  } else {
    console.log("Création du marker pour", username)
    return new mapboxgl.Marker()
      .setLngLat(lngLat)
      .setPopup(new mapboxgl.Popup().setHTML(popupContent))
      .addTo(globals.map);
  }
}

// Expose la fonction startCall globalement pour qu'elle soit accessible depuis le HTML
window.startCall = startCall; 