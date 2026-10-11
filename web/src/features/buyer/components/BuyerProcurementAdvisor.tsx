import { useState, useMemo } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  Phone,
  Calendar,
  Check,
  MapPin,
  ArrowUpDown,
  Search,
} from 'lucide-react'
import { procureListing } from '../api'

export interface ListingWithAdvice {
  id: string
  farmer_id?: string
  farmer_name?: string
  farmer_phone?: string
  plot_id?: string
  acres?: number
  est_tonnes?: number
  harvest_date: string
  combine_sms_used?: boolean
  status: string
  source?: string
  village_name?: string
  district?: string
  price_per_tonne?: number
  total_price?: number
  baler_name?: string
  buyer_org?: string
  procurement_advice?: {
    decision: 'buy' | 'caution' | 'avoid'
    badge: string
    reasons: string[]
    quality_grade: string
    benchmark_diff?: string
  }
  plots?: {
    acres?: number
    villages?: {
      name?: string
      district?: string
    }
  }
}

interface BuyerProcurementAdvisorProps {
  listings: ListingWithAdvice[]
  onReload: () => void
  onFocusVillageOnMap?: (villageName: string) => void
  selectedVillageFilter?: string | null
  onClearVillageFilter?: () => void
  onOpenSatelliteAudit?: (listing: ListingWithAdvice) => void
}

export function BuyerProcurementAdvisor({
  listings,
  onReload,
  onFocusVillageOnMap,
  selectedVillageFilter,
  onClearVillageFilter,
  onOpenSatelliteAudit,
}: BuyerProcurementAdvisorProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'buy' | 'caution' | 'avoid'>('all')
  const [sortBy, setSortBy] = useState<'recommended' | 'price_low' | 'tonnes_high' | 'date'>('recommended')
  const [search, setSearch] = useState('')
  const [procuringId, setProcuringId] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Compute counts
  const counts = useMemo(() => {
    let buy = 0
    let caution = 0
    let avoid = 0
    listings.forEach((l) => {
      const dec = l.procurement_advice?.decision
      if (dec === 'buy') buy++
      else if (dec === 'caution') caution++
      else avoid++
    })
    return { all: listings.length, buy, caution, avoid }
  }, [listings])

  // Filtered & Sorted listings
  const processedListings = useMemo(() => {
    let result = [...listings]

    // Village filter from heatmap
    if (selectedVillageFilter) {
      result = result.filter((l) => {
        const vName = l.village_name || l.plots?.villages?.name || ''
        return vName.toLowerCase().includes(selectedVillageFilter.toLowerCase())
      })
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((l) => {
        const vName = l.village_name || l.plots?.villages?.name || ''
        const fName = l.farmer_name || ''
        return vName.toLowerCase().includes(q) || fName.toLowerCase().includes(q)
      })
    }

    // Tab filter
    if (filterTab !== 'all') {
      result = result.filter((l) => l.procurement_advice?.decision === filterTab)
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'recommended') {
        const rank = { buy: 1, caution: 2, avoid: 3 }
        const rA = rank[a.procurement_advice?.decision || 'caution'] || 2
        const rB = rank[b.procurement_advice?.decision || 'caution'] || 2
        if (rA !== rB) return rA - rB
        return (b.est_tonnes || 0) - (a.est_tonnes || 0)
      }
      if (sortBy === 'price_low') {
        return (a.price_per_tonne || 1500) - (b.price_per_tonne || 1500)
      }
      if (sortBy === 'tonnes_high') {
        return (b.est_tonnes || 0) - (a.est_tonnes || 0)
      }
      if (sortBy === 'date') {
        return new Date(a.harvest_date).getTime() - new Date(b.harvest_date).getTime()
      }
      return 0
    })

    return result
  }, [listings, selectedVillageFilter, search, filterTab, sortBy])

  const handleProcure = async (listing: ListingWithAdvice) => {
    setProcuringId(listing.id)
    setActionSuccess(null)
    try {
      const price = listing.price_per_tonne || 1500
      await procureListing(listing.id, price)
      setActionSuccess(
        `🎉 Successfully generated purchase offer of ₹${price.toLocaleString()}/t for ${listing.est_tonnes || 25}t stubble from ${
          listing.village_name || 'local field'
        }!`
      )
      onReload()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Procurement action failed')
    } finally {
      setProcuringId(null)
    }
  }

  return (
    <div id="procurement-advisor" className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="text-lg font-bold text-copy-primary font-display">
              Smart Procurement Advisor: What to Buy vs What Not to Buy
            </h3>
          </div>
          <p className="text-xs text-copy-secondary mt-0.5">
            Automated quality grading based on combine Straw Management System (SMS), fair pricing index, and baling readiness.
          </p>
        </div>

        {selectedVillageFilter && (
          <div className="flex items-center gap-2 bg-brand/15 border border-brand text-brand px-3 py-1 rounded-xl text-xs font-semibold">
            <span>Filtered by: {selectedVillageFilter}</span>
            <button
              onClick={onClearVillageFilter}
              className="text-xs hover:opacity-80 underline cursor-pointer ml-1"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {actionSuccess && (
        <div className="bg-state-success-dim border border-state-success/30 rounded-xl p-3 text-xs text-state-success flex items-center justify-between">
          <p className="font-semibold">{actionSuccess}</p>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-xs uppercase">
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-surface border border-surface-border p-2.5 rounded-2xl shadow-xs">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 text-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
              filterTab === 'all'
                ? 'bg-copy-primary text-base shadow-xs'
                : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
            }`}
          >
            All Lots ({counts.all})
          </button>
          <button
            onClick={() => setFilterTab('buy')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
              filterTab === 'buy'
                ? 'bg-state-success text-white shadow-xs'
                : 'bg-state-success-dim text-state-success hover:bg-state-success/20'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Recommended to Buy ({counts.buy})</span>
          </button>
          <button
            onClick={() => setFilterTab('caution')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
              filterTab === 'caution'
                ? 'bg-state-warning text-white shadow-xs'
                : 'bg-state-warning-dim text-state-warning hover:bg-state-warning/20'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Buy with Caution ({counts.caution})</span>
          </button>
          <button
            onClick={() => setFilterTab('avoid')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
              filterTab === 'avoid'
                ? 'bg-copy-muted text-white shadow-xs'
                : 'bg-bg-subtle text-copy-muted hover:bg-surface-border'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Locked / Pooled ({counts.avoid})</span>
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-copy-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search farmer or village..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-bg-subtle border border-surface-border-subtle rounded-xl text-copy-primary focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="flex items-center gap-1 text-xs text-copy-secondary">
            <ArrowUpDown className="w-3.5 h-3.5 text-copy-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-bg-subtle border border-surface-border-subtle rounded-xl px-2 py-1 text-xs text-copy-primary focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="recommended">Best Advice</option>
              <option value="price_low">Lowest Price</option>
              <option value="tonnes_high">Highest Volume</option>
              <option value="date">Soonest Harvest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {processedListings.length === 0 ? (
        <div className="bg-surface border border-surface-border rounded-2xl p-8 text-center space-y-2">
          <p className="text-copy-primary font-medium text-sm">No stubble lots match this filter.</p>
          <p className="text-copy-secondary text-xs">
            Try switching filter tabs or clearing your search keywords.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {processedListings.map((listing) => {
            const advice = listing.procurement_advice || {
              decision: 'caution',
              badge: 'Buy with Caution',
              reasons: ['Standard crop residue listing.'],
              quality_grade: 'Grade B (Standard Straw)',
              benchmark_diff: 'At Regional Benchmark',
            }

            const isBuy = advice.decision === 'buy'
            const isCaution = advice.decision === 'caution'
            const isAvoid = advice.decision === 'avoid'

            const tonnes = listing.est_tonnes || 25.0
            const acres = listing.acres || listing.plots?.acres || round(tonnes / 2.5, 1)
            const price = listing.price_per_tonne || 1500
            const totalPrice = listing.total_price || Math.round(tonnes * price)
            const village = listing.village_name || listing.plots?.villages?.name || 'Moga Region'
            const district = listing.district || listing.plots?.villages?.district || 'Punjab'
            const isPooledOrCompleted = listing.status === 'pooled' || listing.status === 'completed'
            const isMatched = listing.status === 'matched'
            const isOpen = listing.status === 'open'

            return (
              <div
                key={listing.id}
                className={`bg-surface border rounded-2xl p-4.5 space-y-3.5 transition-all shadow-xs relative overflow-hidden ${
                  isBuy
                    ? 'border-state-success/40 ring-1 ring-state-success/20'
                    : isCaution
                    ? 'border-state-warning/40'
                    : 'border-surface-border opacity-85'
                }`}
              >
                {/* Top Banner Stripe */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isBuy ? 'bg-state-success' : isCaution ? 'bg-state-warning' : 'bg-copy-muted'
                  }`}
                />

                {/* Header: Village, Farmer, and Decision Badge */}
                <div className="flex items-start justify-between gap-2 pt-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-copy-muted">
                      <MapPin className="w-3.5 h-3.5 text-copy-secondary" />
                      <span className="font-semibold text-copy-primary">{village}</span>
                      <span>•</span>
                      <span>{district}</span>
                    </div>
                    <h4 className="font-display text-base font-bold text-copy-primary mt-0.5">
                      Farmer: {listing.farmer_name || 'Local Verified Farmer'}
                    </h4>
                  </div>

                  {/* Recommendation Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-2xs whitespace-nowrap ${
                      isBuy
                        ? 'bg-state-success text-white'
                        : isCaution
                        ? 'bg-state-warning text-white'
                        : 'bg-bg-subtle text-copy-muted border border-surface-border'
                    }`}
                  >
                    {isBuy && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {isCaution && <AlertTriangle className="w-3.5 h-3.5" />}
                    {isAvoid && <Lock className="w-3.5 h-3.5" />}
                    <span>{advice.badge}</span>
                  </span>
                </div>

                {/* Key Numbers Grid: Tonnes, Rate, Total Cost, Quality */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-bg-subtle border border-surface-border-subtle rounded-xl p-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-copy-muted uppercase font-semibold">Volume</span>
                    <p className="font-bold text-copy-primary text-sm tabular-nums mt-0.5">
                      {tonnes.toFixed(1)} <span className="text-xs font-normal">t</span>
                    </p>
                    <span className="text-[10px] text-copy-secondary">({acres} acres)</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-copy-muted uppercase font-semibold">Rate</span>
                    <p className="font-bold text-copy-primary text-sm tabular-nums mt-0.5">
                      ₹{price.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-copy-secondary">/tonne</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-copy-muted uppercase font-semibold">Total Cost</span>
                    <p className="font-bold text-brand text-sm tabular-nums mt-0.5">
                      ₹{totalPrice.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-copy-secondary">Estimated</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-copy-muted uppercase font-semibold">Straw Grade</span>
                    <p
                      className={`font-semibold text-xs mt-0.5 ${
                        listing.combine_sms_used ? 'text-state-success' : 'text-state-warning'
                      }`}
                    >
                      {listing.combine_sms_used ? 'Grade A (SMS)' : 'Grade B (No SMS)'}
                    </p>
                    <span className="text-[10px] text-copy-secondary">
                      {listing.combine_sms_used ? 'Baler Ready' : 'Needs Rake'}
                    </span>
                  </div>
                </div>

                {/* Decision Rationale: Why to Buy or Why Not */}
                <div
                  className={`rounded-xl p-3 text-xs space-y-1.5 border ${
                    isBuy
                      ? 'bg-state-success-dim/40 border-state-success/20'
                      : isCaution
                      ? 'bg-state-warning-dim/40 border-state-warning/20'
                      : 'bg-bg-subtle/50 border-surface-border'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-[11px]">
                    <span
                      className={
                        isBuy ? 'text-state-success' : isCaution ? 'text-state-warning' : 'text-copy-secondary'
                      }
                    >
                      {isBuy
                        ? '✅ Why You Should Buy This Lot:'
                        : isCaution
                        ? '⚠️ Why to Proceed with Caution:'
                        : 'ℹ️ Lot Status Analysis:'}
                    </span>
                    <span className="text-[10px] text-copy-muted font-normal flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Harvest: {listing.harvest_date}
                    </span>
                  </div>

                  <ul className="space-y-1 text-copy-primary text-[11px] pl-1">
                    {advice.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-copy-muted mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer Actions */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    {listing.farmer_phone && (
                      <span className="text-copy-secondary flex items-center gap-1 text-[11px]">
                        <Phone className="w-3 h-3 text-copy-muted" />
                        <span>{listing.farmer_phone}</span>
                      </span>
                    )}
                    {listing.source === 'whatsapp' && (
                      <span className="px-2 py-0.5 bg-bg-subtle text-copy-secondary text-[10px] rounded-full border border-surface-border">
                        💬 via WhatsApp
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenSatelliteAudit && (
                      <button
                        type="button"
                        onClick={() => onOpenSatelliteAudit(listing)}
                        className="px-2.5 py-1.5 rounded-xl border border-state-success/30 bg-state-success-dim text-state-success text-xs hover:bg-state-success hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-medium"
                        title="Inspect ESA Sentinel-2 & NASA FIRMS zero-burn satellite audit"
                      >
                        <span>🛰️</span>
                        <span>Satellite Audit</span>
                      </button>
                    )}

                    {onFocusVillageOnMap && (
                      <button
                        onClick={() => onFocusVillageOnMap(village)}
                        className="px-2.5 py-1.5 rounded-xl border border-surface-border text-xs text-copy-secondary hover:text-copy-primary hover:bg-bg-subtle transition-colors flex items-center gap-1 cursor-pointer"
                        title="Locate on heatmap"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Map</span>
                      </button>
                    )}

                    {isOpen && (
                      <button
                        onClick={() => handleProcure(listing)}
                        disabled={procuringId === listing.id}
                        className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                          isBuy
                            ? 'bg-brand text-on-brand hover:bg-accent-secondary'
                            : 'bg-surface border border-brand text-brand hover:bg-brand/10'
                        }`}
                      >
                        {procuringId === listing.id ? (
                          <span>Processing...</span>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            <span>Procure (₹{price}/t)</span>
                          </>
                        )}
                      </button>
                    )}

                    {isMatched && (
                      <span className="px-3 py-1.5 bg-brand/15 text-brand rounded-xl text-xs font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Offer Matched (₹{price}/t)</span>
                      </span>
                    )}

                    {isPooledOrCompleted && (
                      <span className="px-3 py-1.5 bg-bg-subtle text-copy-muted rounded-xl text-xs font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Locked in Village Pool</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function round(val: number, precision: number): number {
  const factor = Math.pow(10, precision)
  return Math.round(val * factor) / factor
}
