/**
 * Free Bicycle Routing Engine via Komoot Photon / Nominatim + OSRM Public Bike Routing
 */
import { getCurrentLanguage } from '../context/LanguageContext';
import { geocodeLocation } from '../services/locationService';

export interface CalculatedBikeRoute {
  coordinates: [number, number][]; // [lat, lng]
  distanceKm: number;
  estimatedMinutes: number;
}

// Fetch OSRM Bicycle Path
export async function calculateAutoBikeRoute(
  originText: string,
  destText: string,
  originCoordsOverride?: [number, number] | null,
  destCoordsOverride?: [number, number] | null
): Promise<CalculatedBikeRoute | null> {
  const lang = getCurrentLanguage();
  const originCoord = originCoordsOverride || (await geocodeLocation(originText, lang));
  const destCoord = destCoordsOverride || (await geocodeLocation(destText, lang, originCoord || undefined));

  if (!originCoord || !destCoord) {
    if (!originCoord && !destCoord) {
      throw new Error(
        lang === 'fr'
          ? `Impossible de trouver les coordonnées pour le départ ("${originText}") et la destination ("${destText}"). Choisissez un lieu dans la liste déroulante.`
          : `Could not find coordinates for origin ("${originText}") and destination ("${destText}"). Please pick a location from the dropdown suggestions.`
      );
    }
    if (!originCoord) {
      throw new Error(
        lang === 'fr'
          ? `Impossible de trouver les coordonnées du départ ("${originText}"). Choisissez une suggestion dans la liste.`
          : `Could not find coordinates for origin ("${originText}"). Please choose a suggestion from the dropdown.`
      );
    }
    throw new Error(
      lang === 'fr'
        ? `Impossible de trouver les coordonnées de la destination ("${destText}"). Choisissez une suggestion dans la liste.`
        : `Could not find coordinates for destination ("${destText}"). Please choose a suggestion from the dropdown.`
    );
  }

  // OSRM expects coordinates in lng,lat format
  const osrmUrl = `https://routing.openstreetmap.de/routed-bike/route/v1/cycling/${originCoord[1]},${originCoord[0]};${destCoord[1]},${destCoord[0]}?overview=full&geometries=geojson`;

  const response = await fetch(osrmUrl);
  if (!response.ok) {
    throw new Error(
      lang === 'fr'
        ? `Erreur du serveur d'itinéraire OSRM (statut ${response.status}).`
        : `OSRM routing server error (status ${response.status}).`
    );
  }

  const json = await response.json();

  if (!json.routes || json.routes.length === 0) {
    throw new Error(
      lang === 'fr'
        ? 'Aucun itinéraire cyclable trouvé entre ces deux lieux.'
        : 'No cycling path found between those locations.'
    );
  }

  const route = json.routes[0];
  const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
  const estimatedMinutes = Math.round(route.duration / 60);

  // GeoJSON coordinates come as [lng, lat], Leaflet wants [lat, lng]
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );

  return {
    coordinates,
    distanceKm,
    estimatedMinutes,
  };
}
