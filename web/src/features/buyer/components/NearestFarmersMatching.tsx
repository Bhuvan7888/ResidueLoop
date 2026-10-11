import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MapPin,
  CheckCircle2,
  Truck,
  Sparkles,
  ArrowUpDown,
  Search,
  Filter,
  Check,
  Calendar,
  Satellite,
  Compass,
  TrendingDown,
} from 'lucide-react'
import { calculateDistanceKm, INDUSTRIAL_HUBS, type LatLng } from '../distance'
import { procureListing, type DemandPostItem } from '../api'
import type { ListingWithAdvice } from './BuyerProcurementAdvisor'

interface NearestFarmersMatchingProps {
  listings: ListingWithAdvice[]
  demandPosts: DemandPostItem[]
  onReload: () => void
  onFocusVillageOnMap?: (villageName: string) => void
  onOpenSatelliteAudit?: (listing: ListingWithAdvice) => void
  onCreateDemandClick?: () => void
}

export function NearestFarmersMatching({
  listings,
  demandPosts,
  onReload,
  onFocusVillageOnMap,
  onOpenSatelliteAudit,
  onCreateDemandClick,
}: NearestFarmersMatchingProps) {
  const { t } = useTranslation()

  // Selected demand post (defaults to the first open demand post)
  const openDemandPosts = useMemo(
    () => demandPosts.filter((dp) => dp.status !== 'cancelled'),
    [demandPosts]
  )
  const [selectedDemandId, setSelectedDemandId] = useState<string>(
    openDemandPosts[0]?.id || demandPosts[0]?.id || ''
  )

  // Fallback factory location if no demand post has been created yet
  const [customFactoryHubId, setCustomFactoryHubId] = useState<string>('moga_focal_point')

  // Filter & Sort states
  const [radiusFilterKm, setRadiusFilterKm] = useState<number>(0) // 0 means all
  const [formFilter, setFormFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [sortBy, setSortBy] = useState<'distance' | 'price' | 'tonnes' | 'date'>('distance')

  // Action status
  const [procuringId, setProcuringId] = useState<string | null>(null)
  const [procuredIds, setProcuredIds] = useState<Set<string>>(new Set())
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Active demand tender
  const activeDemand = useMemo(() => {
    return (
      demandPosts.find((dp) => dp.id === selectedDemandId) ||
      openDemandPosts[0] ||
      demandPosts[0] ||
      null
    )
  }, [demandPosts, selectedDemandId, openDemandPosts])

  // Active factory coordinates
  const factoryCoords: LatLng = useMemo(() => {
    if (activeDemand && typeof activeDemand.lat === 'number' && typeof activeDemand.lng === 'number') {
      return { lat: activeDemand.lat, lng: activeDemand.lng }
    }
    const hub = INDUSTRIAL_HUBS.find((h) => h.id === customFactoryHubId) || INDUSTRIAL_HUBS[0]
    return { lat: hub.lat, lng: hub.lng }
  }, [activeDemand, customFactoryHubId])

  // Factory name or description
  const factoryName = useMemo(() => {
    const hub = INDUSTRIAL_HUBS.find(
      (h) =>
        Math.abs(h.lat - factoryCoords.lat) < 0.05 &&
        Math.abs(h.lng - factoryCoords.lng) < 0.05
    )
    if (hub) return hub.name
    return `Factory Hub (${factoryCoords.lat.toFixed(2)}°N, ${factoryCoords.lng.toFixed(2)}°E)`
  }, [factoryCoords])

  // Extract coordinate for a listing
  const getListingCoords = (listing: ListingWithAdvice): LatLng => {
    const anyListing = listing as unknown as { lat?: number; lng?: number }
    if (typeof anyListing.lat === 'number' && typeof anyListing.lng === 'number') {
      return { lat: anyListing.lat, lng: anyListing.lng }
    }
    const plotGeom = listing.plots?.villages as unknown as { geometry?: { coordinates?: [number, number] } }
    if (plotGeom?.geometry?.coordinates && plotGeom.geometry.coordinates.length >= 2) {
      return {
        lat: Number(plotGeom.geometry.coordinates[1]),
        lng: Number(plotGeom.geometry.coordinates[0]),
      }
    }
    return { lat: 30.82, lng: 75.17 }
  }

  // Calculate distance for all listings and augment
  const listingsWithDistance = useMemo(() => {
    return listings.map((l) => {
      const coords = getListingCoords(l)
      const distanceKm = calculateDistanceKm(
        factoryCoords.lat,
        factoryCoords.lng,
        coords.lat,
        coords.lng
      )
      return {
        ...l,
        distanceKm,
        coords,
      }
    })
  }, [listings, factoryCoords])

  // Process and sort listings
  const processedListings = useMemo(() => {
    let result = [...listingsWithDistance]

    // Exclude pooled/completed unless user searches
    result = result.filter(
      (l) => l.status === 'open' || l.status === 'matched' || procuredIds.has(l.id)
    )

    // Radius filter
    if (radiusFilterKm > 0) {
      result = result.filter((l) => l.distanceKm <= radiusFilterKm)
    }

    // Form filter
    if (formFilter !== 'all') {
      result = result.filter(
        (l) =>
          l.stubble_form === formFilter ||
          l.stubble_form_name?.toLowerCase().includes(formFilter.toLowerCase())
      )
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((l) => {
        const vName = l.village_name || l.plots?.villages?.name || ''
        const fName = l.farmer_name || ''
        const dist = l.district || ''
        return (
          vName.toLowerCase().includes(q) ||
          fName.toLowerCase().includes(q) ||
          dist.toLowerCase().includes(q)
        )
      })
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm
      if (sortBy === 'price') return (a.price_per_tonne || 0) - (b.price_per_tonne || 0)
      if (sortBy === 'tonnes') return (b.est_tonnes || 0) - (a.est_tonnes || 0)
      if (sortBy === 'date') return new Date(a.harvest_date).getTime() - new Date(b.harvest_date).getTime()
      return 0
    })

    return result
  }, [listingsWithDistance, radiusFilterKm, formFilter, search, sortBy, procuredIds])

  // Target demand volume and progress calculation
  const targetTonnes = activeDemand?.tonnes_needed || 50
  const tenderPrice = activeDemand?.price_per_tonne || 1850

  const { cumulativeTonnes, farmersMeetingDemandCount, criticalListingIds } = useMemo(() => {
    let runningTotal = 0
    let count = 0
    const criticalIds = new Set<string>()

    // Sort strictly by distance to compute the shortest-path fulfillment
    const sortedByDistance = [...processedListings].sort((a, b) => a.distanceKm - b.distanceKm)

    for (const l of sortedByDistance) {
      const tonnes = l.est_tonnes || 0
      runningTotal += tonnes
      criticalIds.add(l.id)
      count++
      if (runningTotal >= targetTonnes) {
        break
      }
    }

    return {
      cumulativeTonnes: Math.round(runningTotal),
      farmersMeetingDemandCount: count,
      criticalListingIds: criticalIds,
    }
  }, [processedListings, targetTonnes])

  const percentFulfilled = Math.min(Math.round((cumulativeTonnes / targetTonnes) * 100), 200)

  // Handle direct procurement
  const handleProcure = async (listingId: string, offerPrice: number) => {
    setProcuringId(listingId)
    setActionSuccess(null)
    try {
      await procureListing(listingId, offerPrice)
      setProcuredIds((prev) => new Set([...prev, listingId]))
      setActionSuccess(t('buyer.procure_success', 'Purchase offer sent directly to farmer! Stubble lot matched.'))
      onReload()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to send purchase offer')
    } finally {
      setProcuringId(null)
    }
  }

  // Handle batch pooling of all critical matching farmers to satisfy the tender
  const [isBatchPooling, setIsBatchPooling] = useState(false)
  const handlePoolAll = async () => {
    if (criticalListingIds.size === 0) return
    setIsBatchPooling(true)
    setActionSuccess(null)
    try {
      const idsToProcure = Array.from(criticalListingIds)
      for (const id of idsToProcure) {
        await procureListing(id, tenderPrice)
      }
      setProcuredIds((prev) => new Set([...prev, ...idsToProcure]))
      setActionSuccess(
        t(
          'buyer.batch_pool_success',
          `🎉 Successfully created straw pool with ${farmersMeetingDemandCount} nearby farmers for ${cumulativeTonnes} tonnes! Trolley logistics scheduled.`
        )
      )
      onReload()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to pool farmers')
    } finally {
      setIsBatchPooling(false)
    }
  }

  return (
    <section className="bg-surface border border-surface-border rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
      {/* Header & Active Tender Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand/10 text-brand text-lg">🏭</span>
            <h3 className="text-xl font-bold text-copy-primary">
              {t('buyer.nearest_farmers_title', 'Nearest Farmers Meeting Your Factory Demand')}
            </h3>
          </div>
          <p className="text-xs text-copy-secondary max-w-2xl">
            {t(
              'buyer.nearest_farmers_subtitle',
              'Real-time proximity matching between your processing plant and nearby verified farmers with available stubble.'
            )}
          </p>
        </div>

        {/* Tender / Factory Location Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {demandPosts.length > 0 ? (
            <div className="flex items-center gap-2 bg-bg-subtle/60 border border-surface-border rounded-xl px-3 py-1.5 text-xs">
              <span className="text-copy-secondary font-medium">
                {t('buyer.active_tender', 'Active Tender:')}
              </span>
              <select
                value={activeDemand?.id || ''}
                onChange={(e) => setSelectedDemandId(e.target.value)}
                className="bg-base border border-surface-border rounded-lg px-2 py-1 font-semibold text-copy-primary outline-none focus:ring-1 focus:ring-brand"
              >
                {demandPosts.map((dp) => (
                  <option key={dp.id} value={dp.id}>
                    {dp.tonnes_needed}t @ ₹{dp.price_per_tonne}/t ({dp.status || 'open'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-bg-subtle/60 border border-surface-border rounded-xl px-3 py-1.5 text-xs">
              <span className="text-copy-secondary font-medium">{t('buyer.factory_hub', 'Factory Hub:')}</span>
              <select
                value={customFactoryHubId}
                onChange={(e) => setCustomFactoryHubId(e.target.value)}
                className="bg-base border border-surface-border rounded-lg px-2 py-1 font-semibold text-copy-primary outline-none focus:ring-1 focus:ring-brand"
              >
                {INDUSTRIAL_HUBS.map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name} ({hub.district})
                  </option>
                ))}
              </select>
            </div>
          )}

          {onCreateDemandClick && (
            <button
              type="button"
              onClick={onCreateDemandClick}
              className="text-xs bg-brand text-on-brand px-3 py-2 rounded-xl font-bold hover:bg-accent-secondary transition-all cursor-pointer shadow-xs"
            >
              {t('buyer.post_new_tender', '+ Post Factory Tender')}
            </button>
          )}
        </div>
      </div>

      {/* Factory Tender Stats & Cumulative Fulfillment Meter */}
      <div className="bg-gradient-to-r from-brand/5 via-brand/10 to-transparent border border-brand/20 rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-copy-primary bg-surface/80 border border-surface-border px-2.5 py-1 rounded-lg">
              <MapPin className="w-3.5 h-3.5 text-brand" />
              <span>{factoryName}</span>
            </span>
            <span className="text-copy-muted font-mono text-[11px]">
              ({factoryCoords.lat.toFixed(3)}°N, {factoryCoords.lng.toFixed(3)}°E)
            </span>
          </div>

          <div className="flex items-center gap-3 font-medium">
            <span className="text-copy-secondary">
              {t('buyer.target_demand', 'Target Demand:')}{' '}
              <strong className="text-copy-primary">{targetTonnes} {t('common.tonne', 'Tonnes')}</strong>
            </span>
            <span className="text-copy-muted">•</span>
            <span className="text-copy-secondary">
              {t('buyer.tender_rate', 'Tender Offer:')}{' '}
              <strong className="text-state-success font-bold">₹{tenderPrice}/t</strong>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-copy-primary flex items-center gap-1.5">
              <span>🌾</span>
              <span>
                {t('buyer.demand_coverage', 'Proximity Demand Fulfillment Coverage:')}{' '}
                <strong className={cumulativeTonnes >= targetTonnes ? 'text-state-success' : 'text-brand'}>
                  {cumulativeTonnes}t / {targetTonnes}t ({percentFulfilled}%)
                </strong>
              </span>
            </span>
            <span className="text-xs font-semibold text-copy-secondary">
              {farmersMeetingDemandCount > 0 ? (
                <span>
                  {t('buyer.farmers_needed_note', {
                    count: farmersMeetingDemandCount,
                    defaultValue: `${farmersMeetingDemandCount} nearest farmer(s) can fulfill your requirement`,
                  })}
                </span>
              ) : (
                <span>{t('buyer.no_nearby_straw', 'No nearby straw found')}</span>
              )}
            </span>
          </div>

          <div className="w-full h-3 bg-bg-subtle rounded-full overflow-hidden border border-surface-border p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                cumulativeTonnes >= targetTonnes
                  ? 'bg-state-success'
                  : 'bg-brand'
              }`}
              style={{ width: `${Math.min(percentFulfilled, 100)}%` }}
            />
          </div>

          {cumulativeTonnes >= targetTonnes && (
            <p className="text-[11px] text-state-success font-semibold mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {t(
                  'buyer.demand_fulfilled_msg',
                  '100% Demand Met! Sourcing from the nearest farmers reduces transit diesel emissions and hauling time.'
                )}
              </span>
            </p>
          )}

          {farmersMeetingDemandCount > 1 && (
            <div className="mt-4 pt-3 border-t border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🤝</span>
                  <span className="text-xs font-bold text-copy-primary">
                    {t('buyer.cluster_pooling_active', 'Multi-Farmer Cluster Pooling Activated')}
                  </span>
                  <span className="text-[10px] bg-state-success-dim text-state-success px-2 py-0.5 rounded-full font-bold">
                    {cumulativeTonnes >= targetTonnes ? '100% Sourced' : `${percentFulfilled}% Ready`}
                  </span>
                </div>
                <p className="text-[11px] text-copy-secondary">
                  {t(
                    'buyer.cluster_pooling_desc',
                    'Combining nearby smallholders satisfies your factory tender with zero straw burning.'
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={handlePoolAll}
                disabled={isBatchPooling}
                className="px-3.5 py-2 bg-brand text-on-brand font-bold text-xs rounded-xl shadow-xs hover:bg-accent-secondary transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>⚡</span>
                <span>
                  {isBatchPooling
                    ? t('buyer.pooling_progress', 'Creating Pooled Order...')
                    : t('buyer.pool_all_cta', `1-Click Pool All ${farmersMeetingDemandCount} Farmers (${cumulativeTonnes}t)`)}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-state-success-dim border border-state-success/30 rounded-xl text-xs text-state-success font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter and Control Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-copy-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('buyer.search_farmer_village', 'Search farmer name, village, or district...')}
            className="w-full bg-base border border-surface-border pl-9 pr-3 py-2 rounded-xl text-xs text-copy-primary outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Radius & Straw Form Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Radius Filter */}
          <div className="flex items-center gap-1 bg-bg-subtle/50 border border-surface-border rounded-xl p-1">
            <span className="text-[10px] text-copy-muted font-semibold px-1.5">
              <Compass className="w-3 h-3 inline mr-0.5" /> {t('buyer.radius', 'Radius:')}
            </span>
            {[
              { label: t('buyer.all_km', 'All'), val: 0 },
              { label: '< 15 km', val: 15 },
              { label: '< 30 km', val: 30 },
              { label: '< 60 km', val: 60 },
            ].map((r) => (
              <button
                key={r.val}
                type="button"
                onClick={() => setRadiusFilterKm(r.val)}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  radiusFilterKm === r.val
                    ? 'bg-brand text-on-brand shadow-xs'
                    : 'text-copy-secondary hover:text-copy-primary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Form Filter */}
          <div className="flex items-center gap-1 bg-bg-subtle/50 border border-surface-border rounded-xl p-1">
            <Filter className="w-3 h-3 text-copy-muted ml-1" />
            <select
              value={formFilter}
              onChange={(e) => setFormFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-copy-primary outline-none pr-1 cursor-pointer"
            >
              <option value="all">{t('buyer.all_forms', 'All Stubble Forms')}</option>
              <option value="delivered_bales">{t('buyer.form_bales', 'Delivered Bales')}</option>
              <option value="farm_gate_loose">{t('buyer.form_loose', 'Farm-Gate Loose')}</option>
              <option value="processed_pellets">{t('buyer.form_pellets', 'Pellets / Briquettes')}</option>
              <option value="commercial_feed_grade">{t('buyer.form_feed', 'Cattle Feed Grade')}</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 bg-bg-subtle/50 border border-surface-border rounded-xl p-1">
            <ArrowUpDown className="w-3 h-3 text-copy-muted ml-1" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-transparent text-xs font-semibold text-copy-primary outline-none pr-1 cursor-pointer"
            >
              <option value="distance">{t('buyer.sort_distance', '⚡ Nearest First')}</option>
              <option value="price">{t('buyer.sort_price', '💰 Lowest Price')}</option>
              <option value="tonnes">{t('buyer.sort_tonnes', '🌾 Highest Tonnes')}</option>
              <option value="date">{t('buyer.sort_date', '📅 Harvest Date')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Nearest Farmers Card Grid */}
      {processedListings.length === 0 ? (
        <div className="p-8 text-center bg-bg-subtle/30 border border-surface-border rounded-2xl space-y-2">
          <p className="text-copy-secondary text-sm font-medium">
            {t('buyer.no_matching_farmers', 'No farmer listings found matching your current radius or filter.')}
          </p>
          <p className="text-xs text-copy-muted">
            {t('buyer.try_expand_radius', 'Try expanding the radius to < 60 km or resetting straw form filters.')}
          </p>
          <button
            type="button"
            onClick={() => {
              setRadiusFilterKm(0)
              setFormFilter('all')
              setSearch('')
            }}
            className="text-xs text-brand font-bold underline cursor-pointer pt-2"
          >
            {t('buyer.reset_filters', 'Reset Filters')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {processedListings.map((listing) => {
            const isCritical = criticalListingIds.has(listing.id)
            const isProcured = procuredIds.has(listing.id) || listing.status === 'matched'
            const isProcuring = procuringId === listing.id
            const price = listing.price_per_tonne || tenderPrice
            const priceDiff = tenderPrice - price
            const lotTonnes = listing.est_tonnes || 0
            const totalCost = lotTonnes * price

            // Proximity color badges
            const isUltraClose = listing.distanceKm <= 15
            const isMidClose = listing.distanceKm > 15 && listing.distanceKm <= 35

            return (
              <div
                key={listing.id}
                className={`bg-surface border rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden shadow-xs hover:shadow-md ${
                  isCritical
                    ? 'border-brand/40 ring-1 ring-brand/20 bg-gradient-to-b from-brand/5 to-surface'
                    : 'border-surface-border'
                }`}
              >
                {/* Distance Badge & Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs ${
                      isUltraClose
                        ? 'bg-state-success-dim text-state-success border border-state-success/30'
                        : isMidClose
                        ? 'bg-brand/10 text-brand border border-brand/20'
                        : 'bg-bg-subtle text-copy-secondary border border-surface-border'
                    }`}
                  >
                    <span>⚡</span>
                    <span>
                      {listing.distanceKm.toFixed(1)} {t('common.km', 'km')}{' '}
                      <span className="font-normal text-[10px] opacity-80">
                        {isUltraClose
                          ? t('buyer.quick_haul', '(Local Haul)')
                          : isMidClose
                          ? t('buyer.short_transit', '(Short Transit)')
                          : t('buyer.regional_transit', '(Regional)')}
                      </span>
                    </span>
                  </div>

                  {isCritical && (
                    <span
                      title="Part of the nearest cluster fulfilling your factory tender"
                      className="text-[10px] bg-state-success text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{t('buyer.in_pool_badge', 'In Pooled Cluster')}</span>
                    </span>
                  )}
                </div>

                {/* Farmer & Field Info */}
                <div className="space-y-2 mb-3">
                  <div>
                    <h4 className="text-base font-bold text-copy-primary flex items-center gap-1.5">
                      <span>{listing.farmer_name || t('buyer.local_farmer', 'Local Farmer')}</span>
                      <span className="text-[10px] bg-state-success-dim text-state-success px-1.5 py-0.5 rounded-md font-semibold">
                        ✓ {t('buyer.verified', 'Verified')}
                      </span>
                    </h4>
                    <p className="text-xs text-copy-secondary flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                      <strong className="text-copy-primary">
                        {listing.village_name || listing.plots?.villages?.name || 'Local Village'}
                      </strong>
                      <span>, {listing.district || 'Punjab'}</span>
                    </p>
                  </div>

                  {/* Quantity & Form Specs */}
                  <div className="bg-bg-subtle/50 border border-surface-border rounded-xl p-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-copy-muted block uppercase font-semibold">
                        {t('buyer.available_volume', 'Available Volume')}
                      </span>
                      <span className="text-base font-extrabold text-copy-primary">
                        {lotTonnes} <span className="text-xs font-normal text-copy-secondary">{t('common.tonne', 'Tonnes')}</span>
                      </span>
                      <span className="text-[10px] text-copy-muted block">
                        ({listing.acres || Math.round(lotTonnes / 2.5)} {t('common.acres', 'acres')})
                      </span>
                      {isCritical && (
                        <span className="text-[10px] text-state-success font-bold block mt-0.5">
                          +{lotTonnes}t {t('buyer.pooled_contribution', 'in pool')}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-copy-muted block uppercase font-semibold">
                        {t('buyer.stubble_form', 'Form & Grade')}
                      </span>
                      <span className="font-bold text-copy-primary text-xs line-clamp-1">
                        {listing.stubble_form_name || listing.stubble_form || 'Delivered Bales'}
                      </span>
                      <span className="text-[10px] text-brand font-semibold block">
                        {listing.procurement_advice?.quality_grade || 'Grade A Chopped'}
                      </span>
                    </div>
                  </div>

                  {/* Price & Contract Value */}
                  <div className="p-2.5 rounded-xl border border-surface-border bg-base text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-copy-secondary">{t('buyer.asking_rate', 'Rate:')}</span>
                      <span className="font-bold text-copy-primary text-sm">
                        ₹{price.toLocaleString()}/t
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-copy-muted">{t('buyer.total_lot_value', 'Lot Total:')}</span>
                      <span className="font-bold text-state-success">
                        ₹{Math.round(totalCost).toLocaleString()}
                      </span>
                    </div>

                    {priceDiff > 0 ? (
                      <div className="text-[10px] text-state-success font-semibold flex items-center gap-1 pt-0.5">
                        <TrendingDown className="w-3 h-3" />
                        <span>
                          {t('buyer.under_tender_save', {
                            diff: priceDiff,
                            total: Math.round(priceDiff * lotTonnes),
                            defaultValue: `₹${priceDiff}/t below tender (Saves ₹${Math.round(priceDiff * lotTonnes).toLocaleString()})`,
                          })}
                        </span>
                      </div>
                    ) : priceDiff === 0 ? (
                      <div className="text-[10px] text-copy-secondary font-medium pt-0.5">
                        ✓ {t('buyer.exact_tender_match', 'Exact match with your tender offer')}
                      </div>
                    ) : (
                      <div className="text-[10px] text-copy-muted font-medium pt-0.5">
                        {t('buyer.above_tender_by', { diff: Math.abs(priceDiff), defaultValue: `₹${Math.abs(priceDiff)}/t premium` })}
                      </div>
                    )}
                  </div>

                  {/* Harvest readiness */}
                  <div className="flex items-center justify-between text-[11px] text-copy-secondary pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-copy-muted" />
                      <span>{t('buyer.harvest_date', 'Harvest:')}</span>
                      <strong className="text-copy-primary">{listing.harvest_date}</strong>
                    </span>
                    <span className="text-[10px] text-state-success font-semibold">
                      ● {t('buyer.ready_for_pickup', 'Ready for Baler Pickup')}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="space-y-2 pt-2 border-t border-surface-border">
                  {/* Primary Procure CTA */}
                  <button
                    type="button"
                    disabled={isProcured || isProcuring}
                    onClick={() => handleProcure(listing.id, price)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      isProcured
                        ? 'bg-state-success-dim text-state-success border border-state-success/30 cursor-default'
                        : 'bg-brand text-on-brand hover:bg-accent-secondary disabled:opacity-50'
                    }`}
                  >
                    {isProcuring ? (
                      <span>{t('common.processing', 'Sending Offer...')}</span>
                    ) : isProcured ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{t('buyer.offer_sent_matched', 'Offer Sent! Stubble Matched')}</span>
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4" />
                        <span>
                          {t('buyer.procure_this_lot', 'Procure Lot & Send Offer (₹{{price}}/t)', { price })}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Secondary Telemetry & Map Buttons */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => onOpenSatelliteAudit?.(listing)}
                      className="py-1.5 px-2 rounded-lg bg-state-success-dim/50 border border-state-success/20 text-state-success hover:bg-state-success-dim font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title={t('buyer.inspect_sat_title', 'Inspect Sentinel-2 Zero-Burn satellite radar')}
                    >
                      <Satellite className="w-3 h-3" />
                      <span>{t('buyer.sat_audit', 'Satellite Check')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const vName = listing.village_name || listing.plots?.villages?.name
                        if (vName && onFocusVillageOnMap) {
                          onFocusVillageOnMap(vName)
                        }
                      }}
                      className="py-1.5 px-2 rounded-lg bg-bg-subtle border border-surface-border text-copy-secondary hover:text-copy-primary hover:bg-surface font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{t('buyer.view_map', 'View on Map')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
