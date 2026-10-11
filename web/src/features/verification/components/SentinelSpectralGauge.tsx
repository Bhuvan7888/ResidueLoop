interface SentinelSpectralGaugeProps {
  nbrDelta?: number
  verdict?: 'verified' | 'fire_detected' | 'inconclusive' | 'pending'
  confidence?: string
  checkedAt?: string
  compact?: boolean
}

export function SentinelSpectralGauge({
  nbrDelta = 0.04,
  verdict = 'pending',
  confidence = 'high',
  compact = false,
}: SentinelSpectralGaugeProps) {
  // Delta NBR: 0.00 to 0.10 clean, 0.10 to 0.25 moderate shift, >0.25 severe burn scar
  const normalizedDelta = Math.max(-0.1, Math.min(0.6, Number(nbrDelta) || 0))
  // Calculate gauge position percent (from -0.1 to 0.6 -> range 0.7)
  const markerPercent = Math.min(100, Math.max(0, ((normalizedDelta - (-0.1)) / 0.7) * 100))

  // Spectral Band Reflection Estimation based on verdict
  const nirReflectance =
    verdict === 'fire_detected' ? 18 : verdict === 'inconclusive' ? 35 : 54 // %
  const swirReflectance =
    verdict === 'fire_detected' ? 46 : verdict === 'inconclusive' ? 30 : 12 // %

  return (
    <div
      className={`rounded-xl bg-[#0f1712] border border-[#223927] text-white overflow-hidden select-none ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[#80a986] mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🛰️</span>
          <span className="font-semibold uppercase tracking-wider">COPERNICUS SENTINEL-2 MSI</span>
        </div>
        <span className="text-[10px] bg-[#1a2c1f] px-1.5 py-0.5 rounded border border-[#294830] text-emerald-300">
          10m-20m Multispectral
        </span>
      </div>

      {/* Synthetic Satellite Multispectral Parcel View */}
      <div className="relative mb-3 rounded-lg overflow-hidden border border-[#233f28] bg-[#09110a] h-32 flex items-center justify-center">
        {/* Field Grid Canvas */}
        <svg viewBox="0 0 200 100" className="w-full h-full object-cover">
          <defs>
            {/* Healthy / Clean Stubble Pattern */}
            <linearGradient id="cleanFieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2d5236" />
              <stop offset="50%" stopColor="#3d6b4a" />
              <stop offset="100%" stopColor="#25422b" />
            </linearGradient>

            {/* Fire Charred Pattern */}
            <linearGradient id="burnedFieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a0f0d" />
              <stop offset="40%" stopColor="#3a1c18" />
              <stop offset="70%" stopColor="#7a2a22" />
              <stop offset="100%" stopColor="#1e100e" />
            </linearGradient>

            {/* Stubble Straw Pattern */}
            <pattern id="stubblePattern" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M 0 3 L 6 3 M 3 0 L 3 6" stroke="rgba(214, 189, 44, 0.15)" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Background Agricultural Landscape (Surrounding Fields) */}
          <rect x="0" y="0" width="200" height="100" fill="#142417" />
          <line x1="0" y1="45" x2="200" y2="45" stroke="#1c3521" strokeWidth="1" />
          <line x1="70" y1="0" x2="70" y2="100" stroke="#1c3521" strokeWidth="1" />
          <line x1="140" y1="0" x2="140" y2="100" stroke="#1c3521" strokeWidth="1" />

          {/* Irrigation canal line */}
          <path d="M 10 10 Q 90 25 190 15" stroke="#1f4433" strokeWidth="2.5" fill="none" />

          {/* Target Monitored Plot Polygon */}
          <polygon
            points="65,25 135,22 142,78 68,82"
            fill={verdict === 'fire_detected' ? 'url(#burnedFieldGrad)' : 'url(#cleanFieldGrad)'}
            stroke={verdict === 'fire_detected' ? '#a63a2a' : '#528a60'}
            strokeWidth="1.5"
          />

          <polygon points="65,25 135,22 142,78 68,82" fill="url(#stubblePattern)" />

          {/* Active Fire Burn Scar & Thermal Glow */}
          {verdict === 'fire_detected' && (
            <g>
              <ellipse cx="105" cy="52" rx="22" ry="14" fill="#ff3b2f" fillOpacity="0.4" className="animate-pulse" />
              <ellipse cx="105" cy="52" rx="14" ry="9" fill="#ff7a29" fillOpacity="0.6" />
              <ellipse cx="105" cy="52" rx="6" ry="4" fill="#ffe066" fillOpacity="0.9" />
              {/* Burnt ash perimeter */}
              <path
                d="M 88 45 Q 105 38 122 46 Q 128 62 115 65 Q 92 68 88 45 Z"
                fill="none"
                stroke="#ff4d3b"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            </g>
          )}

          {/* Clean Verified Emblem */}
          {verdict === 'verified' && (
            <g>
              <circle cx="105" cy="52" r="14" fill="#1b3821" fillOpacity="0.8" stroke="#34d399" strokeWidth="1" />
              <path d="M 100 52 L 103 56 L 111 48" stroke="#34d399" strokeWidth="2" fill="none" />
            </g>
          )}

          {/* Cloud Cover Layer for Inconclusive */}
          {verdict === 'inconclusive' && (
            <g className="animate-pulse opacity-90">
              <ellipse cx="80" cy="40" rx="35" ry="18" fill="rgba(240, 245, 250, 0.45)" />
              <ellipse cx="130" cy="50" rx="42" ry="20" fill="rgba(240, 245, 250, 0.55)" />
              <ellipse cx="105" cy="45" rx="38" ry="16" fill="rgba(255, 255, 255, 0.65)" />
            </g>
          )}

          {/* Satellite Pixel Grid Overlay (10m Sentinel-2 pixel size illusion) */}
          <line x1="90" y1="20" x2="90" y2="85" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeDasharray="1,2" />
          <line x1="115" y1="20" x2="115" y2="85" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeDasharray="1,2" />
          <line x1="60" y1="52" x2="145" y2="52" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeDasharray="1,2" />

          {/* Plot Center Pin */}
          <circle cx="105" cy="52" r="2.5" fill="#d6bd2c" />
        </svg>

        {/* View Badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-mono text-emerald-300 border border-emerald-900/60">
          False-Color B8-B4-B2 (10m)
        </div>
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-mono text-copy-muted">
          Lat/Lng Centered
        </div>
      </div>

      {/* Multispectral Reflectance Dual Bars */}
      <div className="space-y-2 mb-3 bg-[#132216] p-2.5 rounded-lg border border-[#233a27]">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#8cb391]">
          <span>Spectral Band Response</span>
          <span>Reflectance Index</span>
        </div>

        {/* Band 8 (NIR) */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-emerald-300 mb-0.5">
            <span>Band 8 NIR (842nm) - Cellular Biomass</span>
            <span>{nirReflectance}%</span>
          </div>
          <div className="w-full bg-[#0a140c] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${nirReflectance}%` }}
            />
          </div>
        </div>

        {/* Band 12 (SWIR) */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-amber-300 mb-0.5">
            <span>Band 12 SWIR (2190nm) - Char & Ash Reflection</span>
            <span>{swirReflectance}%</span>
          </div>
          <div className="w-full bg-[#0a140c] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                verdict === 'fire_detected' ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{ width: `${swirReflectance}%` }}
            />
          </div>
        </div>
      </div>

      {/* NBR Formula & Delta Gauge */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#8cb391]">Δ NBR Burn-Scar Shift:</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              verdict === 'fire_detected'
                ? 'bg-red-950 text-red-300 border border-red-800'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}
          >
            {normalizedDelta >= 0 ? `+${normalizedDelta.toFixed(2)}` : normalizedDelta.toFixed(2)}
          </span>
        </div>

        {/* Calibrated Gauge Scale Bar */}
        <div className="relative pt-2 pb-1">
          {/* Gauge track */}
          <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-600 via-amber-500 to-red-600 border border-black/40 overflow-hidden" />

          {/* Indicator Needle Marker */}
          <div
            className="absolute top-1 transform -translate-x-1/2 flex flex-col items-center transition-all duration-500"
            style={{ left: `${markerPercent}%` }}
          >
            <div className="w-2.5 h-2.5 bg-white border-2 border-black rounded-full shadow-md" />
            <div className="w-0.5 h-2 bg-white" />
          </div>
        </div>

        {/* Scale Range Labels */}
        <div className="flex justify-between text-[9px] font-mono text-[#58805e]">
          <span>0.00 (Clean)</span>
          <span>0.15 (Mild)</span>
          <span>0.25 (Threshold)</span>
          <span>&gt;0.35 (Severe Burn)</span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-[#1d3020] flex items-center justify-between text-[10px] font-mono text-[#769e7b]">
        <span>Formula: (NIR - SWIR) / (NIR + SWIR)</span>
        <span className="uppercase text-emerald-300">Confidence: {confidence}</span>
      </div>
    </div>
  )
}
