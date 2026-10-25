/**
 * Free Bicycle Routing Engine via Nominatim + OSRM Public Bike Routing
 */

export interface CalculatedBikeRoute {
  coordinates: [number, number][]; // [lat, lng]
  distanceKm: number;
  estimatedMinutes: number;
}

// 1. Geocode location string to [lat, lng]
async function geocodeLocation(query: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          'Accept-Language': 'fr,en',
        },
      }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  return null;
}

// 2. Fetch OSRM Bicycle Path
export async function calculateAutoBikeRoute(
  originText: string,
  destText: string
): Promise<CalculatedBikeRoute | null> {
  const originCoord = await geocodeLocation(originText);
  const destCoord = await geocodeLocation(destText);

  if (!originCoord || !destCoord) {
    throw new Error('Could not find geographic coordinates for one of the locations.');
  }

  // OSRM expects coordinates in lng,lat format
  const osrmUrl = `https://routing.openstreetmap.de/routed-bike/route/v1/cycling/${originCoord[1]},${originCoord[0]};${destCoord[1]},${destCoord[0]}?overview=full&geometries=geojson`;

  const response = await fetch(osrmUrl);
  const json = await response.json();

  if (!json.routes || json.routes.length === 0) {
    throw new Error('No cycling path found between those locations.');
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
