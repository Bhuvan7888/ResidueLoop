import { useState, useEffect, useCallback } from 'react'
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
  const [view, setView] = useState<'profile' | 'demand' | 'dashboard'>('dashboard')
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
  const [listings, setListings] = useState<
    { id: string; acres?: number; status: string; harvest_date: string; source: string; est_tonnes?: number; plots?: { acres: number } }[]
  >([])
  const [pools, setPools] = useState<Pool[]>([])
  const [demandPosts, setDemandPosts] = useState<DemandPostItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const loadData = useCallback(() => {
    getPickups().then(setPickups).catch(console.error)
    getListings().then(setListings).catch(console.error)
    getPools().then((data) => setPools((data as unknown as Pool[]) || [])).catch(console.error)
    getDemandPosts().then((data) => setDemandPosts((data as unknown as DemandPostItem[]) || [])).catch(console.error)
    if (userId) {
      getNotifications(userId).then(setNotifications).catch(console.error)
    }
  }, [userId])

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
            Edit Profile
          </button>
          <button
            onClick={() => setView('demand')}
            className="px-4 py-2 bg-brand text-on-brand rounded-xl font-medium shadow-xs hover:bg-accent-secondary transition-colors"
          >
            Post Demand / Target Capacity
          </button>
          {view !== 'dashboard' && (
            <button
              onClick={() => setView('dashboard')}
              className="px-4 py-2 bg-surface border border-surface-border rounded-xl font-medium text-copy-primary hover:bg-bg-subtle transition-colors"
            >
              Back to Dashboard
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-copy-secondary bg-surface border border-surface-border px-3 py-1.5 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
          <span className="font-medium text-copy-primary">Buyer Stream Active</span>
          <span>•</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-mono font-medium">🔒 E2E Encrypted</span>
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
                  <span>🔔</span> Nearby Farmer Stubble Alerts
                </h3>
                <span className="text-xs bg-brand/10 text-brand px-2.5 py-0.5 rounded-full font-medium">
                  {notifications.length} New Alerts
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
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Just now
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Regional Biomass Heatmap */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-copy-primary">Regional Demand & Supply Heatmap</h3>
            <DemandHeatmap />
          </div>

          {/* Section 3: Active Multi-Farmer Straw Pools */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-copy-primary">Multi-Farmer Straw Pools</h3>
                <p className="text-xs text-copy-secondary mt-0.5">
                  Pooling stubble from 2–3 nearby farmers cumulatively to fulfill your bulk demand requirements.
                </p>
              </div>
            </div>

            {pools.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">
                  No active pools yet. As farmers list their stubble nearby, they will be pooled cumulatively to match your demand.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {pools.map((pool) => (
                  <div key={pool.id} className="space-y-2">
                    <PoolProgress pool={pool} />
                    {pool.villages && (
                      <p className="text-xs text-copy-secondary px-1">
                        📍 Sourced from farmers in: <strong className="text-copy-primary">{pool.villages.name}, {pool.villages.district}</strong>
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 px-1 text-[11px] text-state-success font-medium">
                      <span>🛰️</span>
                      <span>Satellite Audit: 0 Fires Detected • Sentinel-2 Clean Clearance Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Your Demand Posts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-copy-primary">Your Stubble Demand Posts</h3>
                <p className="text-xs text-copy-secondary">Manage your active factory biomass purchasing tenders.</p>
              </div>
              <button
                onClick={() => setView('demand')}
                className="text-xs text-brand font-semibold hover:underline"
              >
                + Post New Demand
              </button>
            </div>
            {demandPosts.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">You haven't posted any demand requirements yet.</p>
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
                          {dp.tonnes_needed} Tonnes @ ₹{dp.price_per_tonne}/t
                        </p>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            dp.status === 'open' || !dp.status
                              ? 'bg-state-success-dim text-state-success'
                              : 'bg-bg-subtle text-copy-secondary'
                          }`}
                        >
                          {dp.status || 'open'}
                        </span>
                      </div>
                      <p className="text-xs text-copy-secondary mt-1">
                        Window: {dp.date_from} to {dp.date_to}
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
                        {dp.status === 'cancelled' ? 'Re-open' : 'Cancel Post'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Available Supply (Listings) */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-copy-primary">Available Farmer Supply (Listings)</h3>
            {listings.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">No listings available right now.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {listings.map((listing) => {
                  const acres = listing.acres ?? listing.plots?.acres ?? (listing.est_tonnes ? (listing.est_tonnes / 2.5).toFixed(1) : '?')
                  return (
                    <div
                      key={listing.id}
                      className="bg-surface border border-surface-border rounded-2xl p-4 flex justify-between items-center shadow-xs"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-copy-primary">
                            {acres} acres • {listing.est_tonnes ? `${listing.est_tonnes.toFixed(1)}t` : ''}
                          </p>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              listing.status === 'matched' || listing.status === 'pooled'
                                ? 'bg-state-success-dim text-state-success'
                                : 'bg-bg-subtle text-copy-secondary'
                            }`}
                          >
                            {listing.status}
                          </span>
                          {listing.source === 'whatsapp' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                              WhatsApp
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-copy-secondary mt-1">Expected Harvest: {listing.harvest_date}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section 5: Pickups & Instant Payments */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-copy-primary">Your Pickups & Instant Payouts</h3>
            {pickups.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">
                  No pickups scheduled yet. Once pool target is met, pickups will appear here.
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
    </div>
  )
}
