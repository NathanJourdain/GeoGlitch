import globals from './config.js';
import { sendToServer } from './websocket.js';

/**
 * Initialise le watcher de géolocalisation.
 */
export function initGeolocationWatcher() {
  if (!navigator.geolocation) {
    console.error("La géolocalisation n'est pas supportée par ce navigateur.");
    return;
  }

  navigator.geolocation.watchPosition(
    handlePositionChange,
    handlePositionError,
    {
      enableHighAccuracy: false,
      maximumAge: 100,
      timeout: 50000,
    }
  );
}

/**
 * Callback appelé à chaque mise à jour de la position de l'utilisateur.
 * @param {GeolocationPosition} position
 */
function handlePositionChange(position) {
  const { latitude, longitude } = position.coords;

  const location = {
    latitude: latitude,
    longitude: longitude,
    speed: position.coords.speed ?? 0,
  };

  sendToServer({
    type: "update-position",
    data: location,
    username: globals.username,
  });
  console.log("Location sent", location);

  // Centrer la carte sur la nouvelle position
  globals.map.flyTo({
    center: [location.longitude, location.latitude],
    essential: true,
    zoom: 12,
  });
}

/**
 * Callback appelé lorsque la récupération de la position échoue.
 * @param {GeolocationPositionError} error
 */
function handlePositionError(error) {
  console.error("Erreur de géolocalisation :", error);
  alert("Erreur de géolocalisation : " + error.message);
} 