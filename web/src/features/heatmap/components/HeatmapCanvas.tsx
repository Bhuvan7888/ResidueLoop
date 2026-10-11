import { useEffect, useRef, useCallback } from 'react'
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { VillageHeat } from '../api'

// Initialize MapLibre Web Worker for Vite
setWorkerUrl(workerUrl)

const SOURCE = 'villages'

function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return val || fallback
}

function baseStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      'carto-positron': {
        type: 'raster',
        tiles: [
          'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png',
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '&copy; CartoDB, OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'carto-positron-layer',
        type: 'raster',
        source: 'carto-positron',
        minzoom: 0,
        maxzoom: 18,
      },
    ],
  }
}

function toGeoJson(villages: VillageHeat[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: villages.map((v) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      properties: {
        id: v.village_id,
        name: v.name,
        district: v.district || 'Punjab',
        demand: v.demand_tonnes,
        supply: v.supply_tonnes,
        unfilled: v.unfilled_tonnes,
        surplus: v.surplus_tonnes || 0,
        is_unfilled: v.is_unfilled_zone,
      },
    })),
  }
}

function addLayers(map: MapLibreMap) {
  if (map.getSource(SOURCE)) return

  map.addSource(SOURCE, { type: 'geojson', data: toGeoJson([]) })

  // 1. Unfilled Deficit Halo Rings (State Warning)
  map.addLayer({
    id: 'unfilled-zone',
    type: 'circle',
    source: SOURCE,
    filter: ['>', ['get', 'unfilled'], 0],
    paint: {
      'circle-radius': ['+', 16, ['*', 2.6, ['sqrt', ['get', 'unfilled']]]],
      'circle-color': token('--state-warning', '#8a5a00'),
      'circle-opacity': 0.12,
      'circle-stroke-color': token('--state-warning', '#8a5a00'),
      'circle-stroke-width': 2.5,
    },
  })

  // 2. Industrial Demand Circles (Brand Amber Mustard)
  map.addLayer({
    id: 'demand',
    type: 'circle',
    source: SOURCE,
    filter: ['>', ['get', 'demand'], 0],
    paint: {
      'circle-radius': ['+', 8, ['*', 2.0, ['sqrt', ['get', 'demand']]]],
      'circle-color': token('--accent-primary', '#d6bd2c'),
      'circle-opacity': 0.58,
      'circle-stroke-color': token('--accent-primary-text', '#7a6a00'),
      'circle-stroke-width': 1.5,
    },
  })

  // 3. Stubble Supply Circles (Forest Green / Success)
  map.addLayer({
    id: 'supply',
    type: 'circle',
    source: SOURCE,
    filter: ['>', ['get', 'supply'], 0],
    paint: {
      'circle-radius': ['+', 6, ['*', 1.6, ['sqrt', ['get', 'supply']]]],
      'circle-color': token('--state-success', '#3d6b4a'),
      'circle-opacity': 0.55,
      'circle-stroke-color': token('--state-success', '#3d6b4a'),
      'circle-stroke-width': 2,
    },
  })
}

export interface HeatmapCanvasProps {
  villages: VillageHeat[]
  selectedVillageId?: string | null
  onSelectVillage?: (village: VillageHeat | null) => void
  visibleLayers?: {
    demand: boolean
    supply: boolean
    unfilled: boolean
  }
}

export function HeatmapCanvas({
  villages,
  selectedVillageId,
  onSelectVillage,
  visibleLayers = { demand: true, supply: true, unfilled: true },
}: HeatmapCanvasProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const latestData = useRef({ villages, selectedVillageId, onSelectVillage })
  latestData.current = { villages, selectedVillageId, onSelectVillage }

  const updateMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    const { villages: items, selectedVillageId: selId, onSelectVillage: onSelect } = latestData.current
    const source = map.getSource(SOURCE) as GeoJSONSource | undefined
    if (source) {
      source.setData(toGeoJson(items))
    }

    // Clear old markers
    markers.current.forEach((m) => m.remove())
    markers.current = []

    // Add interactive village badges
    items.forEach((v) => {
      const isSelected = selId === v.village_id
      const el = document.createElement('div')
      el.className = `cursor-pointer transition-all duration-200 select-none ${
        isSelected ? 'scale-110 z-30' : 'hover:scale-105 hover:z-20'
      }`

      const hasDeficit = v.is_unfilled_zone && v.unfilled_tonnes > 0
      const hasSupply = v.supply_tonnes > 0

      el.innerHTML = `
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-xs border text-xs font-medium backdrop-blur-xs transition-colors ${
          isSelected
            ? 'bg-copy-primary text-base border-copy-primary ring-2 ring-brand'
            : hasDeficit
            ? 'bg-surface/95 border-state-warning text-state-warning hover:bg-surface'
            : hasSupply
            ? 'bg-surface/95 border-state-success text-state-success hover:bg-surface'
            : 'bg-surface/90 border-surface-border text-copy-secondary hover:bg-surface'
        }">
          <span class="w-2 h-2 rounded-full ${
            hasDeficit ? 'bg-state-warning animate-pulse' : hasSupply ? 'bg-state-success' : 'bg-copy-muted'
          }"></span>
          <span class="font-semibold">${v.name}</span>
          ${
            hasDeficit
              ? `<span class="tabular-nums font-mono text-[10px] opacity-90">-${v.unfilled_tonnes}t</span>`
              : hasSupply
              ? `<span class="tabular-nums font-mono text-[10px] opacity-90">${v.supply_tonnes}t</span>`
              : ''
          }
        </div>
      `

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelect?.(isSelected ? null : v)
      })

      const marker = new Marker({ element: el, offset: [0, -22] }).setLngLat([v.lng, v.lat]).addTo(map)
      markers.current.push(marker)
    })
  }, [])

  // Initialize Map
  useEffect(() => {
    if (!container.current) return

    const map = new MapLibreMap({
      container: container.current,
      style: baseStyle(),
      center: [75.21, 30.85],
      zoom: 9.3,
      minZoom: 6,
      maxZoom: 15,
      attributionControl: false,
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    mapRef.current = map

    map.on('load', () => {
      addLayers(map)
      updateMarkers()

      // Center map initially if items exist
      if (latestData.current.villages.length > 0) {
        const bounds = new LngLatBounds()
        latestData.current.villages.forEach((v) => bounds.extend([v.lng, v.lat]))
        map.fitBounds(bounds, { padding: 90, maxZoom: 11, duration: 0 })
      }
    })

    map.on('click', () => {
      latestData.current.onSelectVillage?.(null)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [updateMarkers])

  // Sync data updates
  useEffect(() => {
    if (mapRef.current?.isStyleLoaded()) {
      updateMarkers()
    }
  }, [villages, selectedVillageId, updateMarkers])

  // Layer visibility toggles
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    if (map.getLayer('demand')) {
      map.setLayoutProperty('demand', 'visibility', visibleLayers.demand ? 'visible' : 'none')
    }
    if (map.getLayer('supply')) {
      map.setLayoutProperty('supply', 'visibility', visibleLayers.supply ? 'visible' : 'none')
    }
    if (map.getLayer('unfilled-zone')) {
      map.setLayoutProperty('unfilled-zone', 'visibility', visibleLayers.unfilled ? 'visible' : 'none')
    }
  }, [visibleLayers])

  // Center on selected village
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedVillageId) return
    const v = villages.find((item) => item.village_id === selectedVillageId)
    if (v) {
      map.flyTo({ center: [v.lng, v.lat], zoom: 10.5, duration: 900 })
    }
  }, [selectedVillageId, villages])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={container} className="h-full w-full" aria-label="Demand & Supply Heatmap" role="region" />
    </div>
  )
}

