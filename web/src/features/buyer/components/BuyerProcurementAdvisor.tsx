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
  Filter,
} from 'lucide-react'
import { procureListing } from '../api'
import { STUBBLE_MARKET_TIERS } from '@/features/listing/marketTiers'

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
  quality_grade?: string
  stubble_form?: string
  stubble_form_name?: string
  market_price_range?: string
  intended_purposes?: string[]
  moisture_level?: string
  procurement_advice?: {
    decision: 'buy' | 'caution' | 'avoid'
    badge: string
    reasons: string[]
    quality_grade: string
    benchmark_diff?: string
    stubble_form?: string
    market_range?: string
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
  const [purposeFilter, setPurposeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'recommended' | 'price_low' | 'tonnes_high' | 'date'>('recommended')
  const [search, setSearch] = useState('')
  const [procuringId, setProcuringId] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [showPriceIndexGuide, setShowPriceIndexGuide] = useState(false)

  // Aggregate counts
  const counts = useMemo(() => {
    let buy = 0
    let caution = 0
    let avoid = 0
    listings.forEach((l) => {
      const dec = l.procurement_advice?.decision || 'caution'
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
        const formName = l.stubble_form_name || ''
        return vName.toLowerCase().includes(q) || fName.toLowerCase().includes(q) || formName.toLowerCase().includes(q)
      })
    }

    // Tab filter
    if (filterTab !== 'all') {
      result = result.filter((l) => l.procurement_advice?.decision === filterTab)
    }

    // Industry / Purpose filter
    if (purposeFilter !== 'all') {
      result = result.filter((l) => {
        const purposes = l.intended_purposes || []
        if (purposeFilter === 'cattle_feed') {
          return purposes.includes('cattle_feed') || l.quality_grade?.includes('grade_a_plus') || l.stubble_form === 'commercial_feed_grade'
        }
        if (purposeFilter === 'thermal_power') {
          return purposes.includes('thermal_power') || purposes.includes('biomass_plant') || l.stubble_form === 'processed_pellets'
        }
        if (purposeFilter === 'paper_packaging') {
          return purposes.includes('paper_packaging') || purposes.includes('paper_mill') || l.stubble_form === 'delivered_bales' || l.combine_sms_used
        }
        if (purposeFilter === 'brick_kiln') {
          return purposes.includes('brick_kiln') || l.stubble_form === 'brick_kiln'
        }
        if (purposeFilter === 'farm_gate_loose') {
          return l.stubble_form === 'farm_gate_loose' || !l.combine_sms_used
        }
        return true
      })
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
        return (a.price_per_tonne || 1850) - (b.price_per_tonne || 1850)
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
  }, [listings, selectedVillageFilter, search, filterTab, purposeFilter, sortBy])

  const handleProcure = async (listing: ListingWithAdvice) => {
    setProcuringId(listing.id)
    setActionSuccess(null)
    try {
      const price = listing.price_per_tonne || 1850
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
            Automated quality grading based on combine SMS, stubble form, moisture, and intended end-use compatibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPriceIndexGuide(!showPriceIndexGuide)}
            className="text-xs px-3 py-1.5 rounded-xl border border-brand bg-brand/10 text-brand-text font-semibold hover:bg-brand/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>💰</span>
            <span>{showPriceIndexGuide ? 'Hide Price Index' : 'View Market Price Index'}</span>
          </button>

          {selectedVillageFilter && (
            <div className="flex items-center gap-2 bg-brand/15 border border-brand text-brand px-3 py-1 rounded-xl text-xs font-semibold">
              <span>Filtered: {selectedVillageFilter}</span>
              <button
                onClick={onClearVillageFilter}
                className="text-xs hover:opacity-80 underline cursor-pointer ml-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cost Breakdown by Source and Form Index (Collapsible / Banner) */}
      {showPriceIndexGuide && (
        <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-copy-primary flex items-center gap-2">
              <span>📊</span> Punjab Stubble Market Benchmark Rates by Source & Form
            </h4>
            <span className="text-[10px] text-copy-muted font-medium">
              Source: BiofuelCircle, NDTV/ET Ground Rates, CEEW, NTPC Tenders & IndiaMART (2026)
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-xs">
            {Object.values(STUBBLE_MARKET_TIERS).map((tier) => (
              <div
                key={tier.id}
                onClick={() => setPurposeFilter(purposeFilter === tier.id ? 'all' : tier.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  purposeFilter === tier.id
                    ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-xs'
                    : 'border-surface-border-subtle bg-bg-subtle/40 hover:bg-bg-subtle'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{tier.icon}</span>
                  <strong className="text-copy-primary text-xs leading-tight">{tier.shortName}</strong>
                </div>
                <div className="text-xs font-bold text-brand">{tier.priceUnit}</div>
                <p className="text-[10px] text-copy-secondary mt-1 leading-normal line-clamp-2">
                  {tier.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-state-success-dim border border-state-success/30 text-state-success text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs font-bold hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs & Purpose Filters */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Decision Tabs */}
          <div className="flex rounded-xl bg-bg-subtle p-1 border border-surface-border text-xs font-medium">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-surface text-copy-primary shadow-xs font-bold'
                  : 'text-copy-secondary hover:text-copy-primary'
              }`}
            >
              All Lots ({counts.all})
            </button>
            <button
              onClick={() => setFilterTab('buy')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                filterTab === 'buy'
                  ? 'bg-state-success text-white shadow-xs font-bold'
                  : 'text-state-success hover:bg-state-success-dim'
              }`}
            >
              <span>✓ Recommended</span>
              <span className="text-[10px] opacity-90">({counts.buy})</span>
            </button>
            <button
              onClick={() => setFilterTab('caution')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                filterTab === 'caution'
                  ? 'bg-state-warning text-white shadow-xs font-bold'
                  : 'text-state-warning hover:bg-state-warning-dim'
              }`}
            >
              <span>⚠ Caution</span>
              <span className="text-[10px] opacity-90">({counts.caution})</span>
            </button>
            <button
              onClick={() => setFilterTab('avoid')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                filterTab === 'avoid'
                  ? 'bg-copy-muted text-white shadow-xs font-bold'
                  : 'text-copy-muted hover:bg-bg-subtle'
              }`}
            >
              <span>✕ Avoid/Locked</span>
              <span className="text-[10px] opacity-90">({counts.avoid})</span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-copy-muted" />
              <input
                type="text"
                placeholder="Search village, farmer, form..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-surface-border bg-surface text-copy-primary focus:ring-2 focus:ring-brand outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-surface border border-surface-border px-2.5 py-1.5 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-copy-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-transparent text-xs text-copy-primary font-medium outline-none cursor-pointer"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="price_low">Sort: Lowest Price</option>
                <option value="tonnes_high">Sort: Highest Tonnes</option>
                <option value="date">Sort: Earliest Harvest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Industry / Purpose Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-copy-muted text-[11px] font-semibold flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Industry Match:
          </span>
          <button
            onClick={() => setPurposeFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
              purposeFilter === 'all'
                ? 'bg-copy-primary text-base font-bold'
                : 'bg-bg-subtle border border-surface-border text-copy-secondary hover:bg-surface'
            }`}
          >
            All Uses
          </button>
          <button
            onClick={() => setPurposeFilter('cattle_feed')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
              purposeFilter === 'cattle_feed'
                ? 'bg-emerald-700 text-white font-bold'
                : 'bg-bg-subtle border border-surface-border text-copy-secondary hover:bg-surface'
            }`}
          >
            <span>🐄</span> Cattle Feed & Dairy (₹4,800–₹8,500/t)
          </button>
          <button
            onClick={() => setPurposeFilter('paper_packaging')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
              purposeFilter === 'paper_packaging'
                ? 'bg-blue-700 text-white font-bold'
                : 'bg-bg-subtle border border-surface-border text-copy-secondary hover:bg-surface'
            }`}
          >
            <span>📦</span> Paper Mills & Delivered Bales (₹1,330–₹3,000/t)
          </button>
          <button
            onClick={() => setPurposeFilter('thermal_power')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
              purposeFilter === 'thermal_power'
                ? 'bg-amber-700 text-white font-bold'
                : 'bg-bg-subtle border border-surface-border text-copy-secondary hover:bg-surface'
            }`}
          >
            <span>⚡</span> Power Plants & NTPC (₹4,320–₹5,500/t)
          </button>
          <button
            onClick={() => setPurposeFilter('brick_kiln')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
              purposeFilter === 'brick_kiln'
                ? 'bg-orange-700 text-white font-bold'
                : 'bg-bg-subtle border border-surface-border text-copy-secondary hover:bg-surface'
            }`}
          >
            <span>🧱</span> Brick Kilns & Furnaces (₹600–₹1,400/t)
          </button>
          <button
            onClick={() => setPurposeFilter('farm_gate_loose')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
              purposeFilter === 'farm_gate_loose'
                ? 'bg-stone-700 text-white font-bold'
                : 'bg-bg-subtle border border-surface-border text-copy-secondary hover:bg-surface'
            }`}
          >
            <span>🚜</span> Farm-Gate Loose (₹500–₹700/t)
          </button>
        </div>
      </div>

      {/* Listing Cards Grid */}
      {processedListings.length === 0 ? (
        <div className="bg-surface border border-surface-border rounded-2xl p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-copy-primary">No straw listings match your current filters.</p>
          <p className="text-xs text-copy-muted">
            Try resetting your search query, village filter, or industry purpose selection.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {processedListings.map((listing) => {
            const advice = listing.procurement_advice
            const isBuy = advice?.decision === 'buy'
            const isCaution = advice?.decision === 'caution'
            const isAvoid = advice?.decision === 'avoid'
            const isOpen = listing.status === 'open'
            const village = listing.village_name || listing.plots?.villages?.name || 'Local Village'
            const tonnes = Number(listing.est_tonnes || 25).toFixed(1)
            const price = listing.price_per_tonne || 1850
            const total = (Number(tonnes) * price).toLocaleString()

            // Visual Styling based on decision
            const borderClass = isBuy
              ? 'border-state-success/40 bg-surface shadow-xs hover:border-state-success'
              : isCaution
              ? 'border-state-warning/40 bg-surface shadow-xs hover:border-state-warning'
              : 'border-surface-border bg-bg-subtle/30 opacity-75'

            const badgeColor = isBuy
              ? 'bg-state-success text-white'
              : isCaution
              ? 'bg-state-warning text-white'
              : 'bg-copy-muted text-white'

            return (
              <div
                key={listing.id}
                className={`rounded-2xl border p-5 space-y-3.5 transition-all flex flex-col justify-between ${borderClass}`}
              >
                {/* Card Top: Badges & Price */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight ${badgeColor}`}>
                          {isBuy && '✓ '}
                          {isCaution && '⚠ '}
                          {isAvoid && '✕ '}
                          {advice?.badge || 'Listing Review'}
                        </span>

                        {listing.combine_sms_used && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Combine SMS Chopped
                          </span>
                        )}

                        {listing.stubble_form_name && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-subtle text-copy-primary border border-surface-border">
                            {listing.stubble_form_name}
                          </span>
                        )}
                      </div>

                      <h4 className="font-display font-bold text-base text-copy-primary">
                        {tonnes} Tonnes Paddy Straw • {listing.acres || '?'} Acres
                      </h4>
                      <p className="text-xs text-copy-secondary flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-copy-muted" />
                        <span>
                          {village}, {listing.district || 'Punjab'}
                        </span>
                        <span>•</span>
                        <span>Farmer: {listing.farmer_name || 'Verified Farmer'}</span>
                      </p>
                    </div>

                    {/* Price Tag */}
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold font-display text-copy-primary">
                        ₹{price.toLocaleString()}/t
                      </div>
                      <div className="text-[11px] text-copy-muted">Est. ₹{total} Total</div>
                      {listing.market_price_range && (
                        <div className="text-[10px] text-brand font-semibold">{listing.market_price_range}</div>
                      )}
                    </div>
                  </div>

                  {/* Quality Grade & Moisture Bar */}
                  <div className="p-2.5 rounded-xl bg-bg-subtle/60 border border-surface-border-subtle flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-copy-muted uppercase font-bold block">Quality Grade</span>
                      <strong className="text-copy-primary text-xs">
                        {advice?.quality_grade || 'Standard Agricultural Straw'}
                      </strong>
                    </div>
                    {listing.moisture_level && (
                      <div className="text-right">
                        <span className="text-[10px] text-copy-muted uppercase font-bold block">Moisture Level</span>
                        <strong className="text-brand text-xs font-mono">{listing.moisture_level}</strong>
                      </div>
                    )}
                  </div>

                  {/* Reasons & Rationale List */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-copy-muted">
                      Procurement Rationale & Analysis:
                    </span>
                    <ul className="space-y-1 text-xs text-copy-secondary">
                      {advice?.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-snug">
                          {isBuy ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-state-success shrink-0 mt-0.5" />
                          ) : isCaution ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-state-warning shrink-0 mt-0.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-copy-muted shrink-0 mt-0.5" />
                          )}
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Harvest Schedule */}
                  <div className="flex items-center gap-2 text-xs text-copy-secondary pt-1">
                    <Calendar className="w-3.5 h-3.5 text-copy-muted" />
                    <span>Harvest: {new Date(listing.harvest_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span>•</span>
                    <span>Baler Partner: {listing.baler_name || 'Regional Straw Baler'}</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-surface-border-subtle flex flex-wrap items-center justify-between gap-2">
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
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
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
                            <span>Procure Lot (₹{price}/t)</span>
                          </>
                        )}
                      </button>
                    )}

                    {!isOpen && (
                      <span className="px-3 py-1.5 bg-bg-subtle text-copy-muted rounded-xl text-xs font-semibold uppercase">
                        {listing.status === 'pooled' ? 'Committed in Pool' : listing.status}
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
