import { useMemo } from 'react'

interface RadarScopeProps {
  verdict?: 'verified' | 'fire_detected' | 'inconclusive' | 'pending'
  firmsHits?: number
  coordinates?: [number, number] // [lng, lat]
  radiusM?: number
  compact?: boolean
}

export function SatelliteRadarScope({
  verdict = 'pending',
  firmsHits = 0,
  coordinates = [75.171, 30.82],
  radiusM = 500,
  compact = false,
}: RadarScopeProps) {
  const [lng, lat] = coordinates

  // Generate deterministic hotspot positions if fire detected
  const fireHotspots = useMemo(() => {
    if (verdict !== 'fire_detected' || firmsHits === 0) return []
    const count = Math.min(firmsHits, 5)
    const spots = []
    const angles = [45, 160, 220, 310, 85]
    const distances = [0.45, 0.65, 0.35, 0.75, 0.55]
    for (let i = 0; i < count; i++) {
      const angle = (angles[i % angles.length] * Math.PI) / 180
      const dist = distances[i % distances.length] * 40
      spots.push({
        x: 50 + Math.cos(angle) * dist,
        y: 50 + Math.sin(angle) * dist,
        temp: 345 + (i * 7),
        confidence: 94 - i * 3,
      })
    }
    return spots
  }, [verdict, firmsHits])

  const radarColor =
    verdict === 'fire_detected'
      ? '#a63a2a'
      : verdict === 'inconclusive'
      ? '#8a5a00'
      : '#3d6b4a'

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#0c120c] text-white border border-[#233526] select-none ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {/* HUD Header */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[#7ea383] mb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                verdict === 'fire_detected' ? 'bg-red-400' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                verdict === 'fire_detected' ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="font-semibold uppercase tracking-wider">NASA FIRMS THERMAL RADAR</span>
        </div>
        <span className="text-[10px] opacity-80">VIIRS 375m • MODIS 1km</span>
      </div>

      {/* Main Radar Screen */}
      <div className="relative mx-auto aspect-square max-w-[280px] w-full flex items-center justify-center">
        {/* Radar Background & Grid */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            {/* Radar Beam Gradient */}
            <linearGradient id="radarBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={radarColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={radarColor} stopOpacity="0" />
            </linearGradient>

            {/* Glowing hotspot */}
            <radialGradient id="hotspotGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff4d4d" stopOpacity="1" />
              <stop offset="60%" stopColor="#ff1a1a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#b30000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background circle */}
          <circle cx="50" cy="50" r="48" fill="#081009" stroke="#1d3020" strokeWidth="1" />

          {/* Concentric Range Rings */}
          <circle cx="50" cy="50" r="12" fill="none" stroke="#254229" strokeWidth="0.6" strokeDasharray="1,1" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="#254229" strokeWidth="0.6" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="#254229" strokeWidth="0.6" strokeDasharray="2,2" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="#365e3b" strokeWidth="0.8" />

          {/* Crosshairs */}
          <line x1="50" y1="4" x2="50" y2="96" stroke="#254229" strokeWidth="0.6" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="#254229" strokeWidth="0.6" />

          {/* Diagonal guidelines */}
          <line x1="16" y1="16" x2="84" y2="84" stroke="#1c3320" strokeWidth="0.4" strokeDasharray="1,2" />
          <line x1="16" y1="84" x2="84" y2="16" stroke="#1c3320" strokeWidth="0.4" strokeDasharray="1,2" />

          {/* Sweeping Beam */}
          <g className="origin-center animate-[spin_4s_linear_infinite]">
            <path d="M 50 50 L 50 4 A 46 46 0 0 1 96 50 Z" fill="url(#radarBeam)" />
            <line x1="50" y1="50" x2="96" y2="50" stroke={radarColor} strokeWidth="1.2" strokeOpacity="0.8" />
          </g>

          {/* Field Buffer Polygon boundary */}
          <polygon
            points="38,36 62,34 66,64 42,66"
            fill={verdict === 'fire_detected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.12)'}
            stroke={verdict === 'fire_detected' ? '#ef4444' : '#34d399'}
            strokeWidth="0.8"
            strokeDasharray="2,1"
          />

          {/* Center Target Dot */}
          <circle cx="50" cy="50" r="2" fill="#d6bd2c" />
          <circle cx="50" cy="50" r="4" fill="none" stroke="#d6bd2c" strokeWidth="0.5" strokeOpacity="0.6" />

          {/* Thermal Hotspots (if fire detected) */}
          {fireHotspots.map((spot, i) => (
            <g key={i}>
              <circle cx={spot.x} cy={spot.y} r="6" fill="url(#hotspotGlow)" className="animate-pulse" />
              <circle cx={spot.x} cy={spot.y} r="2.2" fill="#ffffff" />
            </g>
          ))}

          {/* Range Labels */}
          <text x="51" y="27" fill="#58805e" fontSize="3" fontFamily="monospace">
            250m
          </text>
          <text x="51" y="39" fill="#58805e" fontSize="3" fontFamily="monospace">
            500m
          </text>
          <text x="51" y="48" fill="#58805e" fontSize="3" fontFamily="monospace">
            1km
          </text>
        </svg>

        {/* Cloud Cover Overlay for Inconclusive */}
        {verdict === 'inconclusive' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-full m-2 border border-amber-600/40 p-4 text-center">
            <span className="text-3xl mb-1 animate-pulse">☁️</span>
            <p className="text-xs font-semibold text-amber-200 uppercase tracking-wide">Optical Cloud Obscurity</p>
            <p className="text-[10px] text-amber-300/80 mt-0.5 max-w-[160px] leading-tight">
              Dense cloud cover mask (&gt;70% cloud pixels). Sentinel-2 optical pass inconclusive.
            </p>
          </div>
        )}

        {/* Standby Overlay for Pending */}
        {verdict === 'pending' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[1px] rounded-full m-2 border border-[#2e4d33] p-4 text-center">
            <span className="text-2xl mb-1 opacity-90 animate-bounce">🛰️</span>
            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Sensor in Standby</p>
            <p className="text-[10px] text-emerald-200/70 mt-0.5 max-w-[150px] leading-tight">
              Awaiting harvest pickup completion for automated orbital pass.
            </p>
          </div>
        )}
      </div>

      {/* Telemetry Footer */}
      <div className="mt-3 pt-2.5 border-t border-[#1d3020] grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div>
          <span className="text-[#58805e] block text-[9px] uppercase">Centre Coords</span>
          <span className="text-emerald-300 font-semibold">
            {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
          </span>
        </div>
        <div>
          <span className="text-[#58805e] block text-[9px] uppercase">Scan Aperture</span>
          <span className="text-emerald-300 font-semibold">{radiusM}m buffer radius</span>
        </div>
        <div className="col-span-2 flex items-center justify-between bg-[#132215] px-2 py-1 rounded border border-[#203a24]">
          <span className="text-[#84ab89] text-[10px]">Thermal Hits Detected:</span>
          <span
            className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
              verdict === 'fire_detected'
                ? 'bg-red-950 text-red-300 border border-red-700'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}
          >
            {firmsHits} {firmsHits === 1 ? 'Anomaly' : 'Anomalies'}
          </span>
        </div>
      </div>
    </div>
  )
}
