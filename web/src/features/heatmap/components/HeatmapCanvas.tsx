import { useEffect, useRef } from 'react'
import { LngLatBounds, Map as MapLibreMap, Marker, type GeoJSONSource, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { VillageHeat } from '../api'

const SOURCE = 'villages'
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function baseStyle(): StyleSpecification | string {
  if (MAPTILER_KEY) return `https://api.maptiler.com/maps/dataviz-light/style.json?key=${MAPTILER_KEY}`
  return {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': token('--bg-subtle') } }],
  }
}

function toGeoJson(villages: VillageHeat[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: villages.map((v) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      properties: { demand: v.demand_tonnes, supply: v.supply_tonnes, unfilled: v.unfilled_tonnes },
    })),
  }
}

function addLayers(map: MapLibreMap) {
  map.addSource(SOURCE, { type: 'geojson', data: toGeoJson([]) })
  map.addLayer({
    id: 'demand',
    type: 'circle',
    source: SOURCE,
    filter: ['>', ['get', 'demand'], 0],
    paint: {
      'circle-radius': ['+', 6, ['*', 1.8, ['sqrt', ['get', 'demand']]]],
      'circle-color': token('--accent-primary'),
      'circle-opacity': 0.55,
    },
  })
  map.addLayer({
    id: 'supply',
    type: 'circle',
    source: SOURCE,
    filter: ['>', ['get', 'supply'], 0],
    paint: {
      'circle-radius': ['+', 4, ['*', 1.4, ['sqrt', ['get', 'supply']]]],
      'circle-color': token('--text-secondary'),
      'circle-opacity': 0.3,
      'circle-stroke-color': token('--text-secondary'),
      'circle-stroke-width': 2,
    },
  })
  map.addLayer({
    id: 'unfilled-zone',
    type: 'circle',
    source: SOURCE,
    filter: ['>', ['get', 'unfilled'], 0],
    paint: {
      'circle-radius': ['+', 14, ['*', 2.5, ['sqrt', ['get', 'unfilled']]]],
      'circle-color': token('--state-warning'),
      'circle-opacity': 0.06,
      'circle-stroke-color': token('--state-warning'),
      'circle-stroke-width': 3,
    },
  })
}

interface HeatmapCanvasProps {
  villages: VillageHeat[]
  unfilledLabel: (village: VillageHeat) => string
}

export function HeatmapCanvas({ villages, unfilledLabel }: HeatmapCanvasProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const latest = useRef({ villages, unfilledLabel })
  latest.current = { villages, unfilledLabel }

  const draw = () => {
    const map = mapRef.current
    if (!map) return
    const { villages: items, unfilledLabel: label } = latest.current
    ;(map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(toGeoJson(items))
    markers.current.forEach((marker) => marker.remove())
    markers.current = items
      .filter((v) => v.is_unfilled_zone)
      .map((v) => {
        const tag = document.createElement('div')
        tag.className = 'bg-surface border border-state-warning text-state-warning rounded-xl px-2 py-0.5 text-xs font-medium'
        tag.textContent = label(v)
        return new Marker({ element: tag, offset: [0, -34] }).setLngLat([v.lng, v.lat]).addTo(map)
      })
    if (items.length > 0) {
      const bounds = new LngLatBounds()
      items.forEach((v) => bounds.extend([v.lng, v.lat]))
      map.fitBounds(bounds, { padding: 120, maxZoom: 11, duration: 0 })
    }
  }

  useEffect(() => {
    if (!container.current) return
    const map = new MapLibreMap({ container: container.current, style: baseStyle(), center: [75.2, 30.85], zoom: 9 })
    mapRef.current = map
    map.on('load', () => {
      addLayers(map)
      draw()
    })
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (mapRef.current?.isStyleLoaded() && mapRef.current.getSource(SOURCE)) draw()
  }, [villages])

  // MapLibre's stylesheet forces its own element to position: relative, so it needs a sized wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" aria-label="Demand map" role="img" />
    </div>
  )
}
