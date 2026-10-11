import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  MapPinned,
  RefreshCw,
  Search,
  Layers,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  X,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/common/EmptyState'
import { getVillageHeatmap, type VillageHeat } from '../api'
import { HeatmapCanvas } from './HeatmapCanvas'

interface DemandHeatmapProps {
  onSelectVillageForFilter?: (villageName: string | null) => void
  selectedVillageName?: string | null
}

export function DemandHeatmap({ onSelectVillageForFilter }: DemandHeatmapProps = {}) {
  const { t } = useTranslation()
  const [filterMode, setFilterMode] = useState<'all' | 'deficit' | 'supply'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVillage, setSelectedVillage] = useState<VillageHeat | null>(null)
  const [layers, setLayers] = useState({
    demand: true,
    supply: true,
    unfilled: true,
  })

  // Live polling every 30 seconds with manual instant refresh option
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['heatmap'],
    queryFn: getVillageHeatmap,
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const villages = useMemo(() => data ?? [], [data])

  // Regional aggregated KPIs
  const kpis = useMemo(() => {
    let totalDemand = 0
    let totalSupply = 0
    let totalUnfilled = 0
    let priceSum = 0
    let priceCount = 0

    villages.forEach((v) => {
      totalDemand += v.demand_tonnes || 0
      totalSupply += v.supply_tonnes || 0
      totalUnfilled += v.unfilled_tonnes || 0
      if (v.avg_price && v.avg_price > 0) {
        priceSum += v.avg_price
        priceCount++
      }
    })

    const avgBenchmark = priceCount > 0 ? Math.round(priceSum / priceCount) : 1500

    return {
      totalDemand: Math.round(totalDemand),
      totalSupply: Math.round(totalSupply),
      totalUnfilled: Math.round(totalUnfilled),
      avgBenchmark,
      activeCount: villages.filter((v) => v.demand_tonnes > 0 || v.supply_tonnes > 0).length,
    }
  }, [villages])

  // Filtered village list for directory
  const filteredVillages = useMemo(() => {
    return villages.filter((v) => {
      const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.district && v.district.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchesSearch) return false

      if (filterMode === 'deficit') return v.is_unfilled_zone && v.unfilled_tonnes > 0
      if (filterMode === 'supply') return v.supply_tonnes > 0
      return true
    })
  }, [villages, searchQuery, filterMode])

  const deficitZonesCount = useMemo(
    () => villages.filter((v) => v.is_unfilled_zone && v.unfilled_tonnes > 0).length,
    [villages]
  )

  const supplyHubsCount = useMemo(
    () => villages.filter((v) => v.supply_tonnes > 0).length,
    [villages]
  )

  const handleSelectVillage = (village: VillageHeat | null) => {
    setSelectedVillage(village)
    if (village && onSelectVillageForFilter) {
      onSelectVillageForFilter(village.name)
    }
  }

  return (
    <div className="space-y-3">
      {/* 1. Regional Market KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-surface border border-surface-border rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-copy-muted font-medium">{t('heatmap.buyer_demand', 'Regional Demand')}</span>
            <span className="w-2 h-2 rounded-full bg-brand"></span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-copy-primary tabular-nums">
              {kpis.totalDemand.toLocaleString()}
            </span>
            <span className="text-xs text-copy-secondary">{t('common.tonne', 'tonnes')}</span>
          </div>
          <p className="text-[11px] text-copy-muted mt-0.5">{t('heatmap.orders_sub', 'Industrial factory orders')}</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-copy-muted font-medium">{t('heatmap.farmer_supply', 'Farmer Straw Supply')}</span>
            <span className="w-2 h-2 rounded-full bg-state-success"></span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-state-success tabular-nums">
              {kpis.totalSupply.toLocaleString()}
            </span>
            <span className="text-xs text-copy-secondary">{t('common.tonne', 'tonnes')}</span>
          </div>
          <p className="text-[11px] text-copy-muted mt-0.5">{t('heatmap.listings_sub', 'Live farmer crop listings')}</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-copy-muted font-medium">{t('heatmap.unfilled_deficit', 'Unfilled Deficit')}</span>
            <span className="w-2 h-2 rounded-full bg-state-warning animate-pulse"></span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-state-warning tabular-nums">
              {kpis.totalUnfilled.toLocaleString()}
            </span>
            <span className="text-xs text-copy-secondary">{t('common.tonne', 'tonnes')}</span>
          </div>
          <p className="text-[11px] text-copy-muted mt-0.5">{t('heatmap.shortage_clusters', { count: deficitZonesCount, defaultValue: `${deficitZonesCount} shortage clusters` })}</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-copy-muted font-medium">{t('heatmap.purchase_benchmark', 'Purchase Benchmark')}</span>
            <span className="text-[11px] font-mono text-copy-muted">₹/t</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-copy-primary tabular-nums">
              ₹{kpis.avgBenchmark.toLocaleString()}
            </span>
            <span className="text-xs text-copy-secondary">/t avg</span>
          </div>
          <p className="text-[11px] text-copy-muted mt-0.5">{t('heatmap.regional_fair_rate', 'Regional fair rate')}</p>
        </div>
      </div>

      {/* 2. Main Map Container with Floating HUD Controls */}
      <div className="relative h-[480px] sm:h-[540px] rounded-2xl overflow-hidden border border-surface-border bg-base shadow-xs">
        {/* MapLibre Canvas */}
        <HeatmapCanvas
          villages={villages}
          selectedVillageId={selectedVillage?.village_id}
          onSelectVillage={handleSelectVillage}
          visibleLayers={layers}
        />

        {/* Top Floating Control Bar */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Status & Live Sync Pill */}
          <div className="pointer-events-auto flex items-center gap-2 bg-surface/95 backdrop-blur-md border border-surface-border px-3 py-1.5 rounded-xl shadow-xs text-xs">
            <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
            <span className="font-semibold text-copy-primary">{t('heatmap.live_synced', 'Live Database Synced')}</span>
            <span className="text-copy-muted">•</span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1 text-copy-secondary hover:text-copy-primary font-medium transition-colors"
              title="Refresh live map from database"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-brand' : ''}`} />
              <span>{isFetching ? t('heatmap.syncing', 'Syncing...') : t('heatmap.sync_now', 'Sync Now')}</span>
            </button>
          </div>

          {/* Layer Visibility Toggles */}
          <div className="pointer-events-auto flex items-center gap-1 bg-surface/95 backdrop-blur-md border border-surface-border p-1 rounded-xl shadow-xs text-xs">
            <div className="flex items-center gap-1 px-2 py-0.5 text-copy-muted font-medium">
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('heatmap.layers', 'Layers:')}</span>
            </div>
            <button
              onClick={() => setLayers((prev) => ({ ...prev, demand: !prev.demand }))}
              className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                layers.demand ? 'bg-brand/20 text-brand' : 'text-copy-muted hover:bg-bg-subtle'
              }`}
            >
              {t('heatmap.layer_demand', 'Demand')}
            </button>
            <button
              onClick={() => setLayers((prev) => ({ ...prev, supply: !prev.supply }))}
              className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                layers.supply ? 'bg-state-success-dim text-state-success' : 'text-copy-muted hover:bg-bg-subtle'
              }`}
            >
              {t('heatmap.layer_supply', 'Supply')}
            </button>
            <button
              onClick={() => setLayers((prev) => ({ ...prev, unfilled: !prev.unfilled }))}
              className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                layers.unfilled ? 'bg-state-warning-dim text-state-warning' : 'text-copy-muted hover:bg-bg-subtle'
              }`}
            >
              {t('heatmap.layer_unfilled', 'Deficit')}
            </button>
          </div>
        </div>

        {/* Left Side Floating Drawer: Hotspot Directory */}
        <aside className="absolute left-3 bottom-3 top-14 w-72 sm:w-80 max-h-[calc(100%-4rem)] bg-surface/95 backdrop-blur-md border border-surface-border rounded-2xl p-3 shadow-md flex flex-col gap-2.5 overflow-hidden">
          {/* Header & Filter Tabs */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-display text-base text-copy-primary font-semibold">
                {t('heatmap.title', 'Regional Demand & Supply Map')}
              </h4>
              <span className="text-[10px] text-copy-muted font-mono bg-bg-subtle px-2 py-0.5 rounded-full">
                {villages.length} Villages
              </span>
            </div>
            <p className="text-[11px] text-copy-secondary mt-0.5">
              Click any village marker to inspect procurement balance.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-copy-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('heatmap.search_placeholder', 'Search village or district...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg-subtle border border-surface-border-subtle rounded-xl text-copy-primary placeholder:text-copy-muted focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-copy-primary text-base'
                  : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
              }`}
            >
              {t('heatmap.filter_all', 'All')} ({villages.length})
            </button>
            <button
              onClick={() => setFilterMode('deficit')}
              className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                filterMode === 'deficit'
                  ? 'bg-state-warning text-white'
                  : 'bg-bg-subtle text-state-warning hover:bg-surface-border'
              }`}
            >
              {t('heatmap.filter_deficit', 'Deficit')} ({deficitZonesCount})
            </button>
            <button
              onClick={() => setFilterMode('supply')}
              className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                filterMode === 'supply'
                  ? 'bg-state-success text-white'
                  : 'bg-bg-subtle text-state-success hover:bg-surface-border'
              }`}
            >
              {t('heatmap.filter_supply', 'Supply')} ({supplyHubsCount})
            </button>
          </div>

          {/* Scrollable Village List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {isLoading && (
              <div className="py-8 text-center text-xs text-copy-muted">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-brand" />
                Loading regional biomass clusters...
              </div>
            )}

            {isError && (
              <p className="text-xs text-state-error p-2">
                {t('heatmap.error', 'Could not load map data.')}
              </p>
            )}

            {!isLoading && filteredVillages.length === 0 && (
              <EmptyState
                icon={<MapPinned className="w-5 h-5" />}
                message={t('heatmap.no_zones', 'No villages match the active filter.')}
                className="p-3 text-xs"
              />
            )}

            {filteredVillages.map((v) => {
              const isSelected = selectedVillage?.village_id === v.village_id
              const hasDeficit = v.is_unfilled_zone && v.unfilled_tonnes > 0
              const hasSupply = v.supply_tonnes > 0

              return (
                <button
                  key={v.village_id}
                  onClick={() => handleSelectVillage(isSelected ? null : v)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                    isSelected
                      ? 'bg-copy-primary text-base border-copy-primary shadow-xs'
                      : hasDeficit
                      ? 'bg-surface hover:bg-bg-subtle border-state-warning/30 text-copy-primary'
                      : 'bg-surface hover:bg-bg-subtle border-surface-border text-copy-primary'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{v.name}</span>
                      <span className={`text-[10px] ${isSelected ? 'opacity-70' : 'text-copy-muted'}`}>
                        {v.district || 'Moga'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] tabular-nums">
                      <span className={isSelected ? 'text-brand' : 'text-copy-secondary'}>
                        {t('heatmap.layer_demand', 'Demand')}: <strong>{v.demand_tonnes}t</strong>
                      </span>
                      <span>•</span>
                      <span className={isSelected ? 'text-emerald-300' : 'text-state-success'}>
                        {t('heatmap.layer_supply', 'Supply')}: <strong>{v.supply_tonnes}t</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-1">
                    {hasDeficit ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-state-warning-dim text-state-warning whitespace-nowrap">
                        -{v.unfilled_tonnes}t {t('heatmap.layer_unfilled', 'Deficit')}
                      </span>
                    ) : hasSupply ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-state-success-dim text-state-success whitespace-nowrap">
                        +{v.supply_tonnes}t {t('heatmap.layer_supply', 'Supply')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-copy-muted">Balanced</span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Quick Legend */}
          <div className="pt-2 border-t border-surface-border flex items-center justify-between text-[11px] text-copy-secondary">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-brand"></span> {t('heatmap.layer_demand', 'Demand')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-state-success"></span> {t('heatmap.layer_supply', 'Supply')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border border-state-warning bg-state-warning/20"></span> {t('heatmap.layer_unfilled', 'Deficit')}
            </span>
          </div>
        </aside>

        {/* Right Floating Village Detail Card (Active Selection) */}
        {selectedVillage && (
          <div className="absolute right-3 bottom-3 w-80 bg-surface border border-surface-border rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-brand">
                  {t('heatmap.intel_title', 'Stubble Sourcing Intelligence')}
                </span>
                <h4 className="font-display text-lg font-bold text-copy-primary">
                  {selectedVillage.name}
                </h4>
                <p className="text-xs text-copy-secondary">
                  {selectedVillage.district || 'Moga District'}, Punjab • {selectedVillage.lat.toFixed(3)}°N,{' '}
                  {selectedVillage.lng.toFixed(3)}°E
                </p>
              </div>
              <button
                onClick={() => setSelectedVillage(null)}
                className="p-1 rounded-lg text-copy-muted hover:text-copy-primary hover:bg-bg-subtle transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-bg-subtle rounded-xl p-2.5 border border-surface-border-subtle">
                <span className="text-copy-muted text-[11px]">{t('heatmap.buyer_demand', 'Factory Demand')}</span>
                <p className="text-base font-bold text-copy-primary mt-0.5 tabular-nums">
                  {selectedVillage.demand_tonnes} <span className="text-xs font-normal">{t('common.tonne', 'tonnes')}</span>
                </p>
              </div>

              <div className="bg-bg-subtle rounded-xl p-2.5 border border-surface-border-subtle">
                <span className="text-copy-muted text-[11px]">{t('heatmap.farmer_supply', 'Farmer Supply')}</span>
                <p className="text-base font-bold text-state-success mt-0.5 tabular-nums">
                  {selectedVillage.supply_tonnes} <span className="text-xs font-normal">{t('common.tonne', 'tonnes')}</span>
                </p>
              </div>
            </div>

            <div className="mt-2.5 p-2.5 rounded-xl border border-surface-border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-copy-muted">{t('heatmap.market_balance', 'Market Balance')}:</span>
                {selectedVillage.is_unfilled_zone && selectedVillage.unfilled_tonnes > 0 ? (
                  <span className="font-semibold text-state-warning flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> {t('heatmap.deficit_of', 'Deficit of {{tonnes}}t', { tonnes: selectedVillage.unfilled_tonnes })}
                  </span>
                ) : selectedVillage.supply_tonnes > selectedVillage.demand_tonnes ? (
                  <span className="font-semibold text-state-success flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> {t('heatmap.surplus_of', 'Surplus of {{tonnes}}t', { tonnes: Math.round(selectedVillage.supply_tonnes - selectedVillage.demand_tonnes) })}
                  </span>
                ) : (
                  <span className="font-semibold text-copy-primary">{t('heatmap.balanced_demand', 'Balanced Demand')}</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-copy-muted">{t('heatmap.benchmark_price_label', 'Benchmark Price')}:</span>
                <span className="font-semibold text-copy-primary tabular-nums">
                  ₹{selectedVillage.avg_price || 1500}/tonne
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-copy-muted">{t('heatmap.active_lots', 'Active Farmer Lots')}:</span>
                <span className="font-semibold text-copy-primary tabular-nums">
                  {selectedVillage.listings_count || (selectedVillage.supply_tonnes > 0 ? 1 : 0)} {t('heatmap.lots', 'lots')}
                </span>
              </div>
            </div>

            {onSelectVillageForFilter && (
              <button
                onClick={() => {
                  onSelectVillageForFilter(selectedVillage.name)
                  const procurementEl = document.getElementById('procurement-advisor')
                  if (procurementEl) {
                    procurementEl.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                className="mt-3 w-full py-2 bg-brand text-on-brand rounded-xl text-xs font-semibold hover:bg-accent-secondary transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t('heatmap.match_stubble', '⚡ Match Farmer Stubble')}: {selectedVillage.name}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

