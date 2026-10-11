/**
 * Proximity and geospatial utilities for Buyer Factory Procurement
 */

export interface LatLng {
  lat: number
  lng: number
}

export interface IndustrialHub {
  id: string
  name: string
  district: string
  state: string
  lat: number
  lng: number
  description: string
}

export const INDUSTRIAL_HUBS: IndustrialHub[] = [
  {
    id: 'moga_focal_point',
    name: 'Moga Industrial Focal Point',
    district: 'Moga',
    state: 'Punjab',
    lat: 30.82,
    lng: 75.17,
    description: 'Central biomass corridor, major packaging & dairy hub',
  },
  {
    id: 'ludhiana_focal_point',
    name: 'Ludhiana Industrial Area / Focal Point',
    district: 'Ludhiana',
    state: 'Punjab',
    lat: 30.90,
    lng: 75.85,
    description: 'Punjab manufacturing & large industrial boiler hub',
  },
  {
    id: 'khanna_biomass',
    name: 'Khanna Grain & Biomass Terminal',
    district: 'Ludhiana',
    state: 'Punjab',
    lat: 30.70,
    lng: 76.22,
    description: 'Largest grain market in Asia, high-volume straw baling cluster',
  },
  {
    id: 'sangrur_agro',
    name: 'Sangrur Agro Processing & Bio-CBG Zone',
    district: 'Sangrur',
    state: 'Punjab',
    lat: 30.24,
    lng: 75.84,
    description: 'India’s largest commercial compressed bio-gas (CBG) facility',
  },
  {
    id: 'patiala_focal',
    name: 'Patiala Industrial Estate',
    district: 'Patiala',
    state: 'Punjab',
    lat: 30.34,
    lng: 76.38,
    description: 'Paper mills and engineering boilers',
  },
  {
    id: 'bathinda_power',
    name: 'Bathinda Power & Thermal Belt',
    district: 'Bathinda',
    state: 'Punjab',
    lat: 30.21,
    lng: 74.95,
    description: 'Thermal power generation and co-firing biomass tenders',
  },
  {
    id: 'karnal_agro',
    name: 'Karnal Industrial Complex',
    district: 'Karnal',
    state: 'Haryana',
    lat: 29.69,
    lng: 76.98,
    description: 'Haryana agricultural machinery and packaging paper cluster',
  },
  {
    id: 'ambala_cluster',
    name: 'Ambala Industrial Cluster',
    district: 'Ambala',
    state: 'Haryana',
    lat: 30.38,
    lng: 76.78,
    description: 'Textile processing and scientific industrial furnaces',
  },
  {
    id: 'kurukshetra_agro',
    name: 'Kurukshetra Bio-Energy Zone',
    district: 'Kurukshetra',
    state: 'Haryana',
    lat: 29.97,
    lng: 76.88,
    description: 'Biomass pellets and briquetting units',
  },
  {
    id: 'jalandhar_hub',
    name: 'Jalandhar Industrial Complex',
    district: 'Jalandhar',
    state: 'Punjab',
    lat: 31.33,
    lng: 75.58,
    description: 'Manufacturing and industrial energy consumers',
  },
]

/**
 * Calculate Great-Circle Distance using Haversine formula (km)
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 15.0 // Sensible default regional estimate
  }

  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return Math.round(distance * 10) / 10
}

/**
 * Safely parse coordinates from Postgres PostGIS or GeoJSON location field
 */
export function getCoordinatesFromLocation(location: unknown, fallback: LatLng = { lat: 30.82, lng: 75.17 }): LatLng {
  if (!location) return fallback

  if (typeof location === 'object') {
    const locObj = location as Record<string, unknown>
    if (Array.isArray(locObj.coordinates) && locObj.coordinates.length >= 2) {
      const lng = Number(locObj.coordinates[0])
      const lat = Number(locObj.coordinates[1])
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng }
      }
    }
  }

  return fallback
}
