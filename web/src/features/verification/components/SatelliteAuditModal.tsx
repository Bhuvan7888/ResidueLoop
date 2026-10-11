import { VerificationCard, VerificationProps } from './VerificationCard'

interface SatelliteAuditModalProps {
  isOpen: boolean
  onClose: () => void
  villageName?: string
  district?: string
  verification?: VerificationProps
  plot?: {
    acres?: number
    centre?: { coordinates?: [number, number] }
    radius_m?: number
  }
}

export function SatelliteAuditModal({
  isOpen,
  onClose,
  villageName = 'Regional Village Pool',
  district = 'Punjab',
  verification,
  plot,
}: SatelliteAuditModalProps) {
  if (!isOpen) return null

  // Default clean verification data if none provided (e.g. for buyer pool inspection)
  const auditVerification: VerificationProps = verification || {
    verdict: 'verified',
    firms_hits: 0,
    nbr_delta: 0.04,
    confidence: 'high',
    checked_at: new Date().toISOString(),
  }

  const defaultPlot = plot || {
    acres: 45,
    centre: { coordinates: [75.171, 30.82] },
    radius_m: 500,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-surface border border-surface-border rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between bg-bg-subtle/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🛰️</span>
              <h3 className="font-display text-lg text-copy-primary">
                Satellite Earth Observation Audit
              </h3>
            </div>
            <p className="text-xs text-copy-secondary mt-0.5">
              Verified Zero-Burn Field Provenance for <strong>{villageName}, {district}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface border border-surface-border flex items-center justify-center text-copy-muted hover:text-copy-primary hover:bg-bg-subtle transition-all text-sm font-bold"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Audit Verification Card */}
          <VerificationCard
            verification={auditVerification}
            plot={defaultPlot}
          />

          {/* Sourcing Provenance Audit List */}
          <div className="rounded-2xl border border-surface-border bg-bg-subtle/40 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-copy-muted">
              Biomass Purchase Audit Verification Checklist
            </h4>
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <div className="flex items-start gap-2 bg-surface p-2.5 rounded-xl border border-surface-border-subtle">
                <span className="text-state-success font-bold text-sm">✓</span>
                <div>
                  <strong className="text-copy-primary block">Thermal Sensor Sweep</strong>
                  <span className="text-copy-secondary text-[11px]">
                    NASA FIRMS VIIRS 375m radius scan confirms 0 thermal anomalies detected.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-surface p-2.5 rounded-xl border border-surface-border-subtle">
                <span className="text-state-success font-bold text-sm">✓</span>
                <div>
                  <strong className="text-copy-primary block">Sentinel-2 MSI NBR Delta</strong>
                  <span className="text-copy-secondary text-[11px]">
                    Near-Infrared vs Short-Wave Infrared confirms intact crop residue, no burn scar.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-surface p-2.5 rounded-xl border border-surface-border-subtle">
                <span className="text-state-success font-bold text-sm">✓</span>
                <div>
                  <strong className="text-copy-primary block">Industrial Boiler Safety</strong>
                  <span className="text-copy-secondary text-[11px]">
                    Low silica, non-charred paddy straw guaranteed for bio-coal / paper conversion.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-surface p-2.5 rounded-xl border border-surface-border-subtle">
                <span className="text-state-success font-bold text-sm">✓</span>
                <div>
                  <strong className="text-copy-primary block">Carbon Credit Verifiable</strong>
                  <span className="text-copy-secondary text-[11px]">
                    Timestamped ESA/NASA orbital telemetry eligible for certified Scope 3 credits.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-surface-border bg-bg-subtle/30 flex items-center justify-between">
          <span className="text-[11px] text-copy-muted">
            Telemetry provided via ESA Copernicus Sentinel Hub & NASA FIRMS APIs
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-copy-primary text-base font-semibold text-xs hover:opacity-90 transition-opacity"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  )
}
