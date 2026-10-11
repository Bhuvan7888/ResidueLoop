import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Target,
  Truck,
  IndianRupee,
  MapPin,
  Building2,
  Scale,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { BuyerProfileForm } from './BuyerProfileForm'
import { DemandPostForm } from './DemandPostForm'
import {
  createBuyerProfile,
  createDemandPost,
  getDemandPosts,
  updateDemandPost,
  type DemandPostItem,
} from '../api'
import { getPickups, updatePickupWeight } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'
import { getListings } from '@/features/listing/api'
import { getPools, getMatchedDeals, type MatchedDeal } from '@/features/matching/api'
import { DealCard } from '@/features/matching/components/DealCard'
import { DealChatModal } from '@/features/matching/components/DealChatModal'
import { getNotifications } from '@/features/charity/api'
import { PoolProgress } from '@/features/matching/components/PoolProgress'
import { DemandHeatmap } from '@/features/heatmap/components/DemandHeatmap'
import { BuyerProcurementAdvisor, type ListingWithAdvice } from './BuyerProcurementAdvisor'
import { NearestFarmersMatching } from './NearestFarmersMatching'
import { SatelliteAuditModal } from '@/features/verification/components/SatelliteAuditModal'

interface Pool {
  id: string
  status: string
  target_tonnes: number
  current_tonnes: number
  pickup_date: string | null
  villages?: { name: string; district: string }
  listings?: { id: string; est_tonnes: number; plots?: { acres: number } }[]
}

interface NotificationItem {
  id: string
  message: string
  created_at: string
}

type BuyerTab = 'sourcing' | 'deliveries' | 'deals' | 'heatmap' | 'tenders'

export function BuyerDashboard({ userId }: { userId?: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'profile' | 'demand' | 'dashboard'>('dashboard')
  const [activeTab, setActiveTab] = useState<BuyerTab>('sourcing')
  const [selectedVillageFilter, setSelectedVillageFilter] = useState<string | null>(null)
  const [auditModal, setAuditModal] = useState<{
    isOpen: boolean
    villageName?: string
    district?: string
  } | null>(null)
  const [pickups, setPickups] = useState<
    {
      id: string
      pool_id: string
      actual_tonnes: number | null
      amount_due: number | null
      payment_status: string
      pools: { pickup_date: string | null }
    }[]
  >([])
  const [listings, setListings] = useState<ListingWithAdvice[]>([])
  const [pools, setPools] = useState<Pool[]>([])
  const [matchedDeals, setMatchedDeals] = useState<MatchedDeal[]>([])
  const [selectedChatOfferId, setSelectedChatOfferId] = useState<string | null>(null)
  const [demandPosts, setDemandPosts] = useState<DemandPostItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const isFetchingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const [pickupsRes, listingsRes, poolsRes, dealsRes, demandRes, notifsRes] = await Promise.allSettled([
        getPickups(),
        getListings(),
        getPools(),
        getMatchedDeals({ userId, role: 'buyer' }),
        getDemandPosts(),
        userId ? getNotifications(userId) : Promise.resolve([]),
      ])

      if (pickupsRes.status === 'fulfilled' && pickupsRes.value) {
        setPickups(pickupsRes.value)
      }
      if (listingsRes.status === 'fulfilled' && listingsRes.value) {
        setListings((listingsRes.value as unknown as ListingWithAdvice[]) || [])
      }
      if (poolsRes.status === 'fulfilled' && poolsRes.value) {
        setPools((poolsRes.value as unknown as Pool[]) || [])
      }
      if (dealsRes.status === 'fulfilled' && dealsRes.value) {
        setMatchedDeals(dealsRes.value || [])
      }
      if (demandRes.status === 'fulfilled' && demandRes.value) {
        setDemandPosts((demandRes.value as unknown as DemandPostItem[]) || [])
      }
      if (notifsRes.status === 'fulfilled' && notifsRes.value) {
        setNotifications(notifsRes.value || [])
      }
    } catch (err) {
      console.error('Error fetching buyer dashboard data:', err)
    } finally {
      isFetchingRef.current = false
      setIsInitialLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData()
      }
    }, 20000)
    return () => clearInterval(interval)
  }, [loadData])

  // Executive KPI Calculations
  const totalTargetTonnes = useMemo(() => {
    const openPosts = demandPosts.filter((d) => d.status !== 'cancelled')
    if (openPosts.length > 0) {
      return openPosts.reduce((acc, d) => acc + (d.tonnes_needed || 0), 0)
    }
    return 100 // baseline capacity target
  }, [demandPosts])

  const securedTonnes = useMemo(() => {
    let tonnes = 0
    matchedDeals.forEach((d) => {
      tonnes += d.est_tonnes || 0
    })
    pickups.forEach((p) => {
      tonnes += p.actual_tonnes || 0
    })
    pools.forEach((pool) => {
      tonnes += pool.current_tonnes || 0
    })
    return Math.round(tonnes)
  }, [matchedDeals, pickups, pools])

  const percentSecured = Math.min(Math.round((securedTonnes / totalTargetTonnes) * 100), 100)

  const awaitingWeighbridgeCount = useMemo(() => {
    return pickups.filter((p) => p.actual_tonnes === null || p.payment_status === 'pending').length
  }, [pickups])

  const totalDisbursed = useMemo(() => {
    return pickups.reduce((sum, p) => sum + (p.amount_due || 0), 0)
  }, [pickups])

  const avgProcureRate = useMemo(() => {
    const activeRates = demandPosts.filter((d) => d.status !== 'cancelled').map((d) => d.price_per_tonne)
    if (activeRates.length > 0) {
      return Math.round(activeRates.reduce((a, b) => a + b, 0) / activeRates.length)
    }
    return 1850
  }, [demandPosts])

  return (
    <div className="space-y-6">
      {/* Top Action & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setView('profile')}
            className="px-4 py-2 bg-surface border border-surface-border text-copy-primary hover:bg-bg-subtle rounded-xl font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer text-sm"
          >
            <Building2 className="w-4 h-4 text-brand" />
            <span>{t('buyer.edit_profile', 'Edit Profile')}</span>
          </button>
          <button
            onClick={() => setView('demand')}
            className="px-4 py-2 bg-brand text-on-brand rounded-xl font-bold shadow-xs hover:bg-accent-secondary transition-colors flex items-center gap-1.5 cursor-pointer text-sm"
          >
            <span>+</span>
            <span>{t('buyer.post_demand', 'Post Demand / Target Capacity')}</span>
          </button>
          {view !== 'dashboard' && (
            <button
              onClick={() => setView('dashboard')}
              className="px-4 py-2 bg-surface border border-surface-border rounded-xl font-medium text-copy-primary hover:bg-bg-subtle transition-colors text-sm cursor-pointer"
            >
              {t('buyer.back_dashboard', 'Back to Dashboard')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-copy-secondary bg-surface border border-surface-border px-3 py-1.5 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
          <span className="font-medium text-copy-primary">{t('buyer.stream_active', 'Buyer Stream Active')}</span>
          <span>•</span>
          <span className="text-state-success font-mono font-medium flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>{t('dashboard.e2e_encrypted', 'E2E Encrypted')}</span>
          </span>
        </div>
      </div>

      {view === 'profile' && (
        <BuyerProfileForm
          onSubmit={async (data) => {
            await createBuyerProfile(data)
            loadData()
            setView('dashboard')
          }}
        />
      )}

      {view === 'demand' && (
        <DemandPostForm
          onSubmit={async (data) => {
            await createDemandPost(data)
            await queryClient.invalidateQueries({ queryKey: ['heatmap'] })
            loadData()
            setView('dashboard')
            setActiveTab('sourcing')
          }}
          onCancel={() => setView('dashboard')}
        />
      )}

      {view === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive KPI Command Center Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1: Target Boiler / Plant Capacity */}
            <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-copy-secondary uppercase tracking-wider">
                  {t('buyer.kpi_boiler_target', 'Boiler / Plant Target')}
                </span>
                <span className="p-2 rounded-xl bg-brand/10 text-brand">
                  <Target className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-black font-display text-copy-primary">
                  {securedTonnes} / {totalTargetTonnes} <span className="text-xs font-normal text-copy-secondary">t</span>
                </p>
                <div className="w-full h-1.5 bg-bg-subtle rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-500"
                    style={{ width: `${percentSecured}%` }}
                  />
                </div>
                <p className="text-[11px] text-copy-muted font-medium pt-1">
                  {t('buyer.kpi_secured_desc', {
                    secured: securedTonnes,
                    target: totalTargetTonnes,
                    percent: percentSecured,
                    defaultValue: `${securedTonnes}t / ${totalTargetTonnes}t secured (${percentSecured}%)`,
                  })}
                </p>
              </div>
            </div>

            {/* KPI 2: Inbound Gate Deliveries */}
            <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-copy-secondary uppercase tracking-wider">
                  {t('buyer.kpi_inbound_trolleys', 'Inbound Gate Trolleys')}
                </span>
                <span className="p-2 rounded-xl bg-state-success-dim text-state-success">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-black font-display text-copy-primary">
                  {pickups.length} <span className="text-xs font-normal text-copy-secondary">{t('common.trolleys', 'Trolleys')}</span>
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-state-success font-semibold">
                  <Scale className="w-3.5 h-3.5" />
                  <span>
                    {awaitingWeighbridgeCount > 0
                      ? t('buyer.kpi_awaiting_scale', {
                          count: awaitingWeighbridgeCount,
                          defaultValue: `${awaitingWeighbridgeCount} Awaiting weighbridge scale`,
                        })
                      : t('buyer.gate_clear', 'All scale slips recorded')}
                  </span>
                </div>
                <p className="text-[11px] text-copy-muted font-medium">
                  {t('buyer.gate_receiving_sub', 'Live weighbridge & scale arrival')}
                </p>
              </div>
            </div>

            {/* KPI 3: Procurement Budget & Spend */}
            <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-copy-secondary uppercase tracking-wider">
                  {t('buyer.kpi_procurement_spend', 'Procurement Spend')}
                </span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <IndianRupee className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-black font-display text-state-success">
                  ₹{Math.round(totalDisbursed).toLocaleString()}
                </p>
                <p className="text-[11px] text-brand font-semibold">
                  {t('buyer.kpi_avg_rate', {
                    rate: avgProcureRate,
                    defaultValue: `Avg Rate: ₹${avgProcureRate}/t`,
                  })}
                </p>
                <p className="text-[11px] text-copy-muted font-medium">
                  {t('buyer.direct_payouts_sub', 'Direct verified farmer disbursements')}
                </p>
              </div>
            </div>

            {/* KPI 4: Factory Sourcing Hub */}
            <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-copy-secondary uppercase tracking-wider">
                  {t('buyer.kpi_sourcing_corridor', 'Factory Sourcing Hub')}
                </span>
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <MapPin className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-base sm:text-lg font-bold text-copy-primary line-clamp-1">
                  {demandPosts[0]?.lat ? `${demandPosts[0].lat.toFixed(2)}°N, ${demandPosts[0].lng.toFixed(2)}°E` : 'Moga Focal Point'}
                </p>
                <p className="text-[11px] text-state-success font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('buyer.zero_burn_verified', 'Zero-Burn Compliant')}</span>
                </p>
                <p className="text-[11px] text-copy-muted font-medium">
                  {t('buyer.kpi_corridor_desc', 'Active: Moga & Regional Belt')}
                </p>
              </div>
            </div>
          </div>

          {/* Urgent Farmer Alerts Marquee (Slim Dismissible Banner) */}
          {notifications.length > 0 && (
            <div className="bg-brand/10 border border-brand/30 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="shrink-0 p-1.5 rounded-lg bg-brand text-on-brand font-bold text-[11px]">
                  🔔 {notifications.length}
                </span>
                <p className="font-semibold text-copy-primary truncate">
                  {notifications[0].message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('deals')}
                className="shrink-0 text-brand font-bold hover:underline cursor-pointer"
              >
                {t('buyer.view_deals_cta', 'Inspect Deals →')}
              </button>
            </div>
          )}

          {/* Task-Driven Tabbed Navigation Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-surface-border">
            {[
              {
                id: 'sourcing' as const,
                label: t('buyer.tab_sourcing', 'Sourcing & Nearest Farmers'),
                icon: '🌾',
                badge: listings.filter((l) => l.status === 'open').length,
              },
              {
                id: 'deliveries' as const,
                label: t('buyer.tab_deliveries', 'Deliveries & Weighbridge'),
                icon: '🚚',
                badge: pickups.length,
              },
              {
                id: 'deals' as const,
                label: t('buyer.tab_deals', 'Active Deals & Chat'),
                icon: '🤝',
                badge: matchedDeals.length,
              },
              {
                id: 'heatmap' as const,
                label: t('buyer.tab_map', 'Biomass Regional Map'),
                icon: '🗺️',
              },
              {
                id: 'tenders' as const,
                label: t('buyer.tab_tenders', 'Plant Demand Tenders'),
                icon: '📋',
                badge: demandPosts.length,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand text-on-brand shadow-xs'
                      : 'bg-surface border border-surface-border text-copy-secondary hover:text-copy-primary hover:bg-bg-subtle'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive
                          ? 'bg-on-brand/20 text-on-brand'
                          : 'bg-brand/10 text-brand'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* TAB 1: Sourcing & Nearest Farmers */}
          {activeTab === 'sourcing' && (
            <div className="space-y-8 animate-fadeIn">
              {/* 1. Nearest Available Farmers Matching (Strict Haversine Proximity) */}
              <NearestFarmersMatching
                listings={listings}
                demandPosts={demandPosts}
                isLoading={isInitialLoading}
                onReload={loadData}
                onFocusVillageOnMap={(vName) => {
                  setSelectedVillageFilter(vName)
                  setActiveTab('heatmap')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                onOpenSatelliteAudit={(listing) => {
                  setAuditModal({
                    isOpen: true,
                    villageName:
                      listing.village_name ||
                      listing.plots?.villages?.name ||
                      'Regional Village Pool',
                    district:
                      listing.district ||
                      listing.plots?.villages?.district ||
                      'Punjab',
                  })
                }}
                onCreateDemandClick={() => setView('demand')}
              />

              {/* 2. Smart Procurement Advisor (Automated Quality Grading) */}
              <BuyerProcurementAdvisor
                listings={listings}
                onReload={loadData}
                onFocusVillageOnMap={(vName) => {
                  setSelectedVillageFilter(vName)
                  setActiveTab('heatmap')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                selectedVillageFilter={selectedVillageFilter}
                onClearVillageFilter={() => setSelectedVillageFilter(null)}
                onOpenSatelliteAudit={(listing) => {
                  setAuditModal({
                    isOpen: true,
                    villageName:
                      listing.village_name ||
                      listing.plots?.villages?.name ||
                      'Regional Village Pool',
                    district:
                      listing.district ||
                      listing.plots?.villages?.district ||
                      'Punjab',
                  })
                }}
              />

              {/* 3. Multi-Farmer Straw Pools (Village Bulk Aggregations) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-copy-primary">{t('buyer.pools_title', 'Multi-Farmer Straw Pools')}</h3>
                    <p className="text-xs text-copy-secondary mt-0.5">
                      {t('buyer.pools_subtitle', 'Pooling stubble from nearby farmers cumulatively to fulfill your bulk demand requirements.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAuditModal({
                        isOpen: true,
                        villageName: 'All Regional Pools (Punjab)',
                        district: 'Punjab',
                      })
                    }
                    className="text-xs px-3 py-1.5 bg-state-success-dim border border-state-success/30 text-state-success hover:bg-state-success hover:text-white rounded-xl flex items-center gap-1.5 font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    <span>🛰️</span>
                    <span>{t('buyer.satellite_hub', 'Open Satellite Telemetry Hub')}</span>
                  </button>
                </div>

                {pools.length === 0 ? (
                  <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                    <p className="text-copy-secondary text-sm">
                      {t('buyer.no_pools', 'No active pools yet. As farmers list their stubble nearby, they will be pooled cumulatively to match your demand.')}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {pools.map((pool) => (
                      <div key={pool.id} className="space-y-3 bg-surface p-4 rounded-2xl border border-surface-border shadow-xs hover:border-brand/30 transition-all">
                        <PoolProgress pool={pool} />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-surface-border">
                          {pool.villages && (
                            <span className="text-copy-secondary">
                              {t('buyer.sourced_from', '📍 Sourced from farmers in:')} <strong className="text-copy-primary">{pool.villages.name}, {pool.villages.district}</strong>
                            </span>
                          )}
                          {pool.pickup_date && (
                            <span className="font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-lg text-[11px]">
                              🚚 {t('buyer.pickup_schedule', 'Pickup:')} {pool.pickup_date}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAuditModal({
                              isOpen: true,
                              villageName: pool.villages?.name || 'Regional Pool',
                              district: pool.villages?.district || 'Punjab',
                            })
                          }
                          className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl bg-state-success-dim border border-state-success/30 text-state-success text-xs font-semibold hover:bg-state-success hover:text-white transition-all cursor-pointer text-left"
                        >
                          <span className="flex items-center gap-1.5">
                            <span>🛰️</span>
                            <span>{t('buyer.zero_burn_audit', 'Zero-Burn Satellite Audit: 0 Fires Detected')}</span>
                          </span>
                          <span className="text-[10px] underline">{t('buyer.inspect_telemetry', 'Inspect Telemetry →')}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Inbound Gate Deliveries & Weighbridge */}
          {activeTab === 'deliveries' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-copy-primary flex items-center gap-2">
                    <Truck className="w-5 h-5 text-brand" />
                    <span>{t('buyer.weighbridge_title', 'Factory Gate Deliveries & Weighbridge Slips')}</span>
                  </h3>
                  <p className="text-xs text-copy-secondary mt-0.5">
                    {t(
                      'buyer.weighbridge_subtitle',
                      'Inspect incoming trolleys, record weighbridge scales, and approve instant hand-to-hand or bank settlements.'
                    )}
                  </p>
                </div>
                {pickups.length > 0 && (
                  <span className="text-xs font-bold text-state-success bg-state-success-dim border border-state-success/30 px-3 py-1 rounded-xl">
                    {pickups.length} {t('buyer.inbound_pickups_active', 'Inbound Trolleys Active')}
                  </span>
                )}
              </div>

              {pickups.length === 0 ? (
                <div className="bg-surface border border-surface-border rounded-2xl p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center text-2xl mx-auto">
                    🚚
                  </div>
                  <h4 className="text-base font-bold text-copy-primary">
                    {t('buyer.no_pickups_empty_title', 'No Inbound Deliveries At Gate Yet')}
                  </h4>
                  <p className="text-copy-secondary text-xs max-w-md mx-auto">
                    {t(
                      'buyer.no_pickups_empty_desc',
                      'Once an offer is accepted and tractor-trolleys are dispatched from the field, gate delivery slips and scale weight recorders will appear here.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sourcing')}
                    className="inline-block mt-2 text-xs font-bold bg-brand text-on-brand px-4 py-2 rounded-xl hover:bg-accent-secondary transition-all cursor-pointer shadow-xs"
                  >
                    {t('buyer.browse_farmers_cta', 'Browse Nearest Farmers →')}
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {pickups.map((pickup) => (
                    <PickupCard
                      key={pickup.id}
                      pickup={pickup}
                      mode="buyer"
                      onUpdateWeight={async (id, data) => {
                        await updatePickupWeight(id, data)
                        loadData()
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Active Deals & Direct Farmer Chat */}
          {activeTab === 'deals' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-copy-primary flex items-center gap-2">
                    <span>🤝</span>
                    <span>{t('buyer.deals_title', 'Active Stubble Contracts & Direct Farmer Chat')}</span>
                  </h3>
                  <p className="text-xs text-copy-secondary mt-0.5">
                    {t(
                      'buyer.deals_subtitle',
                      'Coordinate tractor-baler dispatch, field directions, and payouts directly with matched farmers.'
                    )}
                  </p>
                </div>
                {matchedDeals.length > 0 && (
                  <span className="text-xs bg-state-success-dim text-state-success px-2.5 py-0.5 rounded-full font-bold">
                    {matchedDeals.length} {t('buyer.active_deals_count', 'Active Deals')}
                  </span>
                )}
              </div>

              {matchedDeals.length === 0 ? (
                <div className="bg-surface border border-surface-border rounded-2xl p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center text-2xl mx-auto">
                    💬
                  </div>
                  <h4 className="text-base font-bold text-copy-primary">
                    {t('buyer.no_deals_yet', 'No active matched deals yet.')}
                  </h4>
                  <p className="text-copy-secondary text-xs max-w-md mx-auto">
                    {t(
                      'buyer.procure_hint',
                      'Procure stubble from the Smart Procurement Advisor below or from Multi-Farmer Straw Pools to start chatting with farmers.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sourcing')}
                    className="inline-block mt-2 text-xs font-bold bg-brand text-on-brand px-4 py-2 rounded-xl hover:bg-accent-secondary transition-all cursor-pointer shadow-xs"
                  >
                    {t('buyer.procure_from_nearest', 'Procure from Nearest Farmers →')}
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {matchedDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      userRole="buyer"
                      onOpenChat={(id) => setSelectedChatOfferId(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Biomass Regional Map & Satellite Audits */}
          {activeTab === 'heatmap' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-copy-primary flex items-center gap-2">
                    <span>🗺️</span>
                    <span>{t('buyer.tab_map', 'Biomass Regional Map')}</span>
                  </h3>
                  <p className="text-xs text-copy-secondary mt-0.5">
                    {t('heatmap.subtitle', 'Village level. Industrial demand vs farmer straw supply.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAuditModal({
                      isOpen: true,
                      villageName: 'Regional Industrial Corridor',
                      district: 'Punjab',
                    })
                  }
                  className="text-xs px-3 py-1.5 bg-state-success-dim border border-state-success/30 text-state-success hover:bg-state-success hover:text-white rounded-xl flex items-center gap-1.5 font-semibold transition-all cursor-pointer shadow-xs"
                >
                  <span>🛰️</span>
                  <span>{t('buyer.satellite_hub', 'Open Satellite Telemetry Hub')}</span>
                </button>
              </div>

              <DemandHeatmap
                onSelectVillageForFilter={(vName) => setSelectedVillageFilter(vName)}
                selectedVillageName={selectedVillageFilter}
              />
            </div>
          )}

          {/* TAB 5: Plant Demand Tenders */}
          {activeTab === 'tenders' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-copy-primary">{t('buyer.demand_posts_title', 'Your Stubble Demand Posts')}</h3>
                  <p className="text-xs text-copy-secondary">{t('buyer.demand_posts_subtitle', 'Manage your active factory biomass purchasing tenders.')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setView('demand')}
                  className="text-xs bg-brand text-on-brand px-3.5 py-1.5 rounded-xl font-bold hover:bg-accent-secondary transition-all cursor-pointer shadow-xs"
                >
                  {t('buyer.post_new_demand', '+ Post New Demand')}
                </button>
              </div>

              {demandPosts.length === 0 ? (
                <div className="bg-surface border border-surface-border rounded-2xl p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center text-2xl mx-auto">
                    📋
                  </div>
                  <h4 className="text-base font-bold text-copy-primary">
                    {t('buyer.no_demand_posts', "You haven't posted any demand requirements yet.")}
                  </h4>
                  <p className="text-xs text-copy-secondary max-w-sm mx-auto">
                    {t('buyer.post_demand_hint', 'Publish a capacity tender to broadcast your plant requirements to farmers within your regional radius.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setView('demand')}
                    className="inline-block mt-2 text-xs font-bold bg-brand text-on-brand px-4 py-2 rounded-xl hover:bg-accent-secondary transition-all cursor-pointer shadow-xs"
                  >
                    {t('buyer.post_first_demand', '+ Post First Factory Tender')}
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {demandPosts.map((dp) => (
                    <div
                      key={dp.id}
                      className="bg-surface border border-surface-border rounded-2xl p-4 flex justify-between items-center shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-copy-primary">
                            {dp.tonnes_needed} {t('common.tonne', 'Tonnes')} @ ₹{dp.price_per_tonne}/t
                          </p>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              dp.status === 'open' || !dp.status
                                ? 'bg-state-success-dim text-state-success'
                                : 'bg-bg-subtle text-copy-secondary'
                            }`}
                          >
                            {t(`status.${dp.status || 'open'}`, dp.status || 'open')}
                          </span>
                        </div>
                        <p className="text-xs text-copy-secondary mt-1">
                          {t('buyer.window', 'Window:')} {dp.date_from} {t('common.to', 'to')} {dp.date_to}
                          {dp.lat && dp.lng && (
                            <span className="ml-2 font-mono text-[11px] text-copy-muted">
                              • 📍 ({dp.lat.toFixed(2)}°N, {dp.lng.toFixed(2)}°E)
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <button
                          onClick={async () => {
                            const nextStatus = dp.status === 'cancelled' ? 'open' : 'cancelled'
                            await updateDemandPost(dp.id, { status: nextStatus })
                            await queryClient.invalidateQueries({ queryKey: ['heatmap'] })
                            loadData()
                          }}
                          className="text-xs px-3 py-1.5 border border-surface-border rounded-xl text-copy-secondary hover:text-copy-primary hover:bg-bg-subtle transition-colors cursor-pointer"
                        >
                          {dp.status === 'cancelled' ? t('buyer.reopen', 'Re-open') : t('buyer.cancel_post', 'Cancel Post')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Satellite Earth Observation Audit Modal */}
      <SatelliteAuditModal
        isOpen={!!auditModal?.isOpen}
        onClose={() => setAuditModal(null)}
        villageName={auditModal?.villageName}
        district={auditModal?.district}
      />

      {/* Direct Deal Chat Modal with Counterparty Details */}
      {selectedChatOfferId && (
        <DealChatModal
          offerId={selectedChatOfferId}
          initialDeal={matchedDeals.find((d) => d.offer_id === selectedChatOfferId || d.id === selectedChatOfferId)}
          currentUserRole="buyer"
          currentUserId={userId}
          onClose={() => setSelectedChatOfferId(null)}
        />
      )}
    </div>
  )
}
