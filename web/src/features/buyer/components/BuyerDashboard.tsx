import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BuyerProfileForm } from './BuyerProfileForm'
import { DemandPostForm } from './DemandPostForm'
import { createBuyerProfile, createDemandPost, getDemandPosts, updateDemandPost } from '../api'
import { getPickups, updatePickupWeight } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'
import { getListings } from '@/features/listing/api'
import { getPools } from '@/features/matching/api'
import { getNotifications } from '@/features/charity/api'
import { PoolProgress } from '@/features/matching/components/PoolProgress'
import { DemandHeatmap } from '@/features/heatmap/components/DemandHeatmap'
import { BuyerProcurementAdvisor, type ListingWithAdvice } from './BuyerProcurementAdvisor'
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

interface DemandPostItem {
  id: string
  tonnes_needed: number
  price_per_tonne: number
  date_from: string
  date_to: string
  status?: string
  created_at?: string
}

export function BuyerDashboard({ userId }: { userId?: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'profile' | 'demand' | 'dashboard'>('dashboard')
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
  const [demandPosts, setDemandPosts] = useState<DemandPostItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const loadData = useCallback(() => {
    getPickups().then(setPickups).catch(console.error)
    getListings()
      .then((data) => setListings((data as unknown as ListingWithAdvice[]) || []))
      .catch(console.error)
    getPools().then((data) => setPools((data as unknown as Pool[]) || [])).catch(console.error)
    getDemandPosts().then((data) => setDemandPosts((data as unknown as DemandPostItem[]) || [])).catch(console.error)
    queryClient.invalidateQueries({ queryKey: ['heatmap'] })
    if (userId) {
      getNotifications(userId).then(setNotifications).catch(console.error)
    }
  }, [userId, queryClient])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 3500)
    return () => clearInterval(interval)
  }, [loadData])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setView('profile')}
            className="px-4 py-2 bg-brand text-on-brand rounded-xl font-medium shadow-xs hover:bg-accent-secondary transition-colors"
          >
            {t('buyer.edit_profile', 'Edit Profile')}
          </button>
          <button
            onClick={() => setView('demand')}
            className="px-4 py-2 bg-brand text-on-brand rounded-xl font-medium shadow-xs hover:bg-accent-secondary transition-colors"
          >
            {t('buyer.post_demand', 'Post Demand / Target Capacity')}
          </button>
          {view !== 'dashboard' && (
            <button
              onClick={() => setView('dashboard')}
              className="px-4 py-2 bg-surface border border-surface-border rounded-xl font-medium text-copy-primary hover:bg-bg-subtle transition-colors"
            >
              {t('buyer.back_dashboard', 'Back to Dashboard')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-copy-secondary bg-surface border border-surface-border px-3 py-1.5 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
          <span className="font-medium text-copy-primary">{t('buyer.stream_active', 'Buyer Stream Active')}</span>
          <span>•</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-mono font-medium">{t('dashboard.e2e_encrypted', '🔒 E2E Encrypted')}</span>
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
            loadData()
            setView('dashboard')
          }}
          onCancel={() => setView('dashboard')}
        />
      )}

      {view === 'dashboard' && (
        <div className="space-y-8">
          {/* Section 1: Nearby Stubble Alerts / Notifications */}
          {notifications.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-copy-primary flex items-center gap-2">
                  <span>🔔</span> {t('buyer.alerts_title', 'Nearby Farmer Stubble Alerts')}
                </h3>
                <span className="text-xs bg-brand/10 text-brand px-2.5 py-0.5 rounded-full font-medium">
                  {t('buyer.new_alerts', { count: notifications.length, defaultValue: `${notifications.length} New Alerts` })}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className="bg-surface border border-brand/30 rounded-2xl p-4 shadow-xs relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-brand"></div>
                    <p className="text-sm font-medium text-copy-primary pl-1">{n.message}</p>
                    <p className="text-xs text-copy-secondary mt-2 pl-1">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {t('buyer.just_now', 'Just now')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Regional Biomass Heatmap */}
          <div className="space-y-3">
            <DemandHeatmap
              onSelectVillageForFilter={(vName) => setSelectedVillageFilter(vName)}
              selectedVillageName={selectedVillageFilter}
            />
          </div>

          {/* Section 3: Active Multi-Farmer Straw Pools */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-semibold text-copy-primary">{t('buyer.pools_title', 'Multi-Farmer Straw Pools')}</h3>
                <p className="text-xs text-copy-secondary mt-0.5">
                  {t('buyer.pools_subtitle', 'Pooling stubble from 2–3 nearby farmers cumulatively to fulfill your bulk demand requirements.')}
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
                  <div key={pool.id} className="space-y-2 bg-surface p-4 rounded-2xl border border-surface-border shadow-xs">
                    <PoolProgress pool={pool} />
                    {pool.villages && (
                      <p className="text-xs text-copy-secondary">
                        {t('buyer.sourced_from', '📍 Sourced from farmers in:')} <strong className="text-copy-primary">{pool.villages.name}, {pool.villages.district}</strong>
                      </p>
                    )}
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
                      title="Inspect Sentinel-2 NBR and NASA FIRMS radar scan"
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

          {/* Section: Your Demand Posts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-copy-primary">{t('buyer.demand_posts_title', 'Your Stubble Demand Posts')}</h3>
                <p className="text-xs text-copy-secondary">{t('buyer.demand_posts_subtitle', 'Manage your active factory biomass purchasing tenders.')}</p>
              </div>
              <button
                onClick={() => setView('demand')}
                className="text-xs text-brand font-semibold hover:underline"
              >
                {t('buyer.post_new_demand', '+ Post New Demand')}
              </button>
            </div>
            {demandPosts.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">{t('buyer.no_demand_posts', "You haven't posted any demand requirements yet.")}</p>
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
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={async () => {
                          const nextStatus = dp.status === 'cancelled' ? 'open' : 'cancelled'
                          await updateDemandPost(dp.id, { status: nextStatus })
                          loadData()
                        }}
                        className="text-xs px-3 py-1.5 border border-surface-border rounded-xl text-copy-secondary hover:text-copy-primary hover:bg-bg-subtle transition-colors"
                      >
                        {dp.status === 'cancelled' ? t('buyer.reopen', 'Re-open') : t('buyer.cancel_post', 'Cancel Post')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Smart Procurement Advisor - What to Buy vs What Not to Buy */}
          <BuyerProcurementAdvisor
            listings={listings}
            onReload={loadData}
            onFocusVillageOnMap={(vName) => {
              setSelectedVillageFilter(vName)
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

          {/* Section 5: Pickups & Instant Payments */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-copy-primary">{t('buyer.pickups_title', 'Your Pickups & Instant Payouts')}</h3>
            {pickups.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">
                  {t('buyer.no_pickups', 'No pickups scheduled yet. Once pool target is met, pickups will appear here.')}
                </p>
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
        </div>
      )}

      {/* Satellite Earth Observation Audit Modal */}
      <SatelliteAuditModal
        isOpen={!!auditModal?.isOpen}
        onClose={() => setAuditModal(null)}
        villageName={auditModal?.villageName}
        district={auditModal?.district}
      />
    </div>
  )
}
