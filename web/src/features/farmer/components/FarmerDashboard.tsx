import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { NewListingForm } from '@/features/listing/components/NewListingForm'
import { createListing, getPlots, getListings } from '@/features/listing/api'
import { getOffers, handleOfferAction, getPools } from '@/features/matching/api'
import { OfferCard } from '@/features/matching/components/OfferCard'
import { PoolProgress } from '@/features/matching/components/PoolProgress'
import { getPickups, updatePickupPayment } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'
import { VerificationCard } from '@/features/verification/components/VerificationCard'
import { triggerVerification } from '@/features/verification/api'
import { getNotifications, requestAssistance } from '@/features/charity/api'
import { getMessages } from '@/features/whatsapp/api'
import { WhatsappSimulator } from '@/features/whatsapp/components/WhatsappSimulator'
import { AssistanceRequestForm } from '@/features/charity/components/AssistanceRequestForm'
import { getFarmerProfile } from '@/features/farmer/api'

interface PoolData {
  id: string
  status: string
  target_tonnes: number
  current_tonnes: number
  pickup_date: string | null
  village_id?: string
  villages?: { name: string }
}

export function FarmerDashboard({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'listing' | 'dashboard' | 'assistance'>('dashboard')
  const [activeListing, setActiveListing] = useState<string | null>(null)
  const [listings, setListings] = useState<
    { id: string; acres?: number; status: string; harvest_date: string; source: string; created_at?: string; plots?: { acres: number }; est_tonnes?: number; pool_id?: string | null }[]
  >([])
  
  const { data: plots = [] } = useQuery({
    queryKey: ['plots', userId],
    queryFn: () => getPlots(userId),
    enabled: !!userId,
  })

  const { data: farmerProfile } = useQuery({
    queryKey: ['farmerProfile', userId],
    queryFn: () => getFarmerProfile(userId),
    enabled: !!userId,
  })

  const [offers, setOffers] = useState<
    { id: string; status: string; price_per_tonne: number; pickup_start?: string; pickup_end?: string; buyers?: { org_name: string }; balers?: { name: string } }[]
  >([])
  const [pools, setPools] = useState<PoolData[]>([])
  const [pickups, setPickups] = useState<
    { id: string; pool_id: string; actual_tonnes: number | null; amount_due: number | null; payment_status: string; quality_notes?: string | null; pools: { pickup_date: string | null } }[]
  >([])
  const [messages, setMessages] = useState<{ id: string; direction: string; raw_text: string; created_at: string }[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [verifyingPlotId, setVerifyingPlotId] = useState<string | null>(null)

  const reloadData = useCallback(() => {
    getOffers().then((data) => setOffers((data as unknown as typeof offers) || [])).catch(console.error)
    getPickups().then(setPickups).catch(console.error)
    getPools().then((data) => setPools((data as unknown as PoolData[]) || [])).catch(console.error)
    getListings(userId).then(setListings).catch(console.error)
    getMessages(userId).then(setMessages).catch(console.error)
    if (userId) {
      getNotifications(userId).then(setNotifications).catch(console.error)
    }
  }, [userId])

  useEffect(() => {
    reloadData()
    const interval = setInterval(reloadData, 3500)
    return () => clearInterval(interval)
  }, [reloadData])

  const isVerified = farmerProfile?.idStatus === 'verified'
  const idStatus = farmerProfile?.idStatus || 'not_submitted'

  const handleQuickCharityList = async (listingId: string) => {
    try {
      await requestAssistance({ listing_id: listingId, purpose: 'Urgent citizen crowdfunding clearance to avoid burning' })
      setActionMsg('🌾 Stubble successfully listed on the Citizen Charity Crowdfunding Portal!')
      reloadData()
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to list on charity portal')
    }
  }

  const handleRunSatelliteCheck = async (
    plotId: string,
    scenario: 'verified' | 'fire_detected' | 'inconclusive' | 'real'
  ) => {
    setVerifyingPlotId(plotId)
    try {
      await triggerVerification(plotId, scenario)
      await queryClient.invalidateQueries({ queryKey: ['plots', userId] })
      reloadData()
      setActionMsg(`🛰️ Satellite check completed (scenario: ${scenario})! Check results below.`)
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to trigger satellite check')
    } finally {
      setVerifyingPlotId(null)
    }
  }

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div className="rounded-xl bg-state-success-dim border border-state-success/30 p-4 text-sm text-state-success flex items-center justify-between">
          <p className="font-medium">{actionMsg}</p>
          <button onClick={() => setActionMsg(null)} className="text-xs uppercase font-semibold">✕</button>
        </div>
      )}

      {/* ID Verification Status Banner */}
      <div className="space-y-3">
        {idStatus === 'verified' && (
          <div className="rounded-2xl bg-state-success-dim border border-state-success/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <h4 className="text-sm font-bold text-state-success">Government ID Verified</h4>
                <p className="text-xs text-copy-secondary">
                  Your identity is verified. You can create crop residue listings and join village pooling.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-state-success text-white self-start sm:self-auto">
              Verified Farmer
            </span>
          </div>
        )}

        {idStatus === 'pending' && (
          <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <h4 className="text-sm font-bold text-amber-900">ID Verification Pending Review</h4>
                <p className="text-xs text-amber-800">
                  Your ID proof is under review. You can browse the app, but listings remain locked until approved.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-amber-200 text-amber-900 self-start sm:self-auto">
              Reviewing
            </span>
          </div>
        )}

        {idStatus === 'rejected' && (
          <div className="rounded-2xl bg-state-error-dim border border-state-error/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="text-sm font-bold text-state-error">ID Verification Rejected</h4>
                <p className="text-xs text-state-error opacity-90">
                  Reason: {farmerProfile?.rejectionReason || 'Document photo unreadable or mismatched.'} Please resubmit in the setup section above.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-state-error text-white self-start sm:self-auto">
              Rejected
            </span>
          </div>
        )}

        {idStatus === 'not_submitted' && (
          <div className="rounded-2xl bg-bg-subtle border border-surface-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <h4 className="text-sm font-bold text-copy-primary">ID Proof Not Submitted</h4>
                <p className="text-xs text-copy-secondary">
                  Please submit your ID proof (Aadhaar, Voter ID) in the setup card above to unlock listing straw.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-surface border border-surface-border text-copy-secondary self-start sm:self-auto">
              Required
            </span>
          </div>
        )}
      </div>

      {/* Sync Status & Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {view === 'dashboard' && (
            <div className="relative group">
              <button
                onClick={() => {
                  if (!isVerified) {
                    setActionMsg('⚠️ Verified ID required! Please submit and verify your ID proof before creating a listing.')
                    return
                  }
                  setView('listing')
                }}
                className={`px-4 py-2 rounded-xl font-medium shadow-xs transition-all ${
                  isVerified
                    ? 'bg-brand text-on-brand hover:bg-accent-secondary'
                    : 'bg-bg-subtle text-copy-muted border border-surface-border cursor-not-allowed opacity-80'
                }`}
              >
                + New Listing
              </button>
              {!isVerified && (
                <span className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block w-52 p-2 bg-surface text-copy-primary text-xs rounded-xl shadow-lg border border-surface-border z-20">
                  Verified ID required to create listings.
                </span>
              )}
            </div>
          )}
          {view !== 'dashboard' && (
            <button
              onClick={() => setView('dashboard')}
              className="px-4 py-2 bg-surface border border-surface-border rounded-xl font-medium text-copy-primary hover:bg-bg-subtle"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-copy-secondary bg-surface border border-surface-border px-3 py-1.5 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
          <span className="font-medium text-copy-primary">Live Sync Active</span>
          <span>•</span>
          <span className="font-mono font-medium text-state-success">🔒 E2E Encrypted</span>
        </div>
      </div>

      {/* Real-time Notifications: Payments & Matches */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-copy-primary flex items-center gap-1.5">
              <span>🔔</span> Real-Time Notifications
            </h4>
            <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium">
              {notifications.length} updates
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {notifications.slice(0, 4).map((n) => (
              <div
                key={n.id}
                className="bg-surface border border-brand/30 rounded-xl p-3 shadow-xs text-xs relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-brand"></div>
                <p className="font-medium text-copy-primary pl-1">{n.message}</p>
                <p className="text-copy-secondary mt-1 pl-1 opacity-70">
                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'listing' && (
        plots.length === 0 ? (
          <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center space-y-3">
            <h4 className="text-lg font-medium text-copy-primary">No plots registered</h4>
            <p className="text-copy-secondary text-sm">Please register at least one plot in the "Your Plots" section before creating a listing.</p>
            <button onClick={() => setView('dashboard')} className="px-4 py-2 bg-brand text-on-brand rounded-xl text-sm font-medium">Back to Dashboard</button>
          </div>
        ) : (
          <NewListingForm 
            plots={plots.map((p, idx) => ({ id: p.id, name: `Plot ${idx + 1}`, acres: p.acres }))}
            onSubmit={async (data) => {
              await createListing(data)
              reloadData()
              setView('dashboard')
            }} 
            onCancel={() => setView('dashboard')} 
          />
        )
      )}

      {view === 'assistance' && activeListing && (
        <AssistanceRequestForm 
          listingId={activeListing}
          onSubmit={() => { reloadData(); setView('dashboard') }}
          onCancel={() => setView('dashboard')}
        />
      )}

      {view === 'dashboard' && (
        <div className="space-y-8">
          {/* Section 1: Listings & Pooling */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-copy-primary">Your Residue Listings</h3>
            <div className="grid gap-4">
              {listings.length === 0 ? (
                <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                  <p className="text-copy-secondary text-sm">
                    No listings created yet. Click "+ New Listing" above to list paddy straw.
                  </p>
                </div>
              ) : (
                listings.map((listing) => {
                  const acresDisplay = listing.acres ?? listing.plots?.acres ?? (listing.est_tonnes ? (listing.est_tonnes / 2.5).toFixed(1) : '?')
                  const isUnsold = listing.status === 'open'
                  const isMatched = listing.status === 'matched'
                  const isPooled = listing.status === 'pooled'
                  const isCompleted = listing.status === 'completed'
                  const linkedPool = listing.pool_id ? pools.find((p) => p.id === listing.pool_id) : null

                  return (
                    <div key={listing.id} className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <p className="font-semibold text-copy-primary">{acresDisplay} acres • {listing.est_tonnes ? `${listing.est_tonnes.toFixed(1)}t` : ''}</p>
                            <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${
                              isMatched || isPooled ? 'bg-state-success-dim text-state-success' :
                              isCompleted ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {t(`status.${listing.status}`, isUnsold ? 'Unsold (In Marketplace)' : listing.status)}
                            </span>
                            {listing.source === 'whatsapp' && (
                              <span className="px-2 py-0.5 bg-bg-subtle text-copy-secondary text-xs rounded-full flex items-center gap-1 border border-surface-border">
                                💬 via WhatsApp
                              </span>
                            )}
                            {isUnsold && (
                              <span className="px-2 py-0.5 bg-state-error-dim text-state-error text-xs rounded-full font-medium">
                                🔥 Burning Risk if Unsold &gt; 2 Days
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-copy-secondary mt-1">Expected Harvest Date: {listing.harvest_date}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isUnsold && (
                            <button
                              type="button"
                              onClick={() => handleQuickCharityList(listing.id)}
                              className="px-3 py-1.5 bg-state-error text-white rounded-lg text-xs font-semibold hover:opacity-90 shadow-xs"
                              title="List on Charity Crowdfunding so normal citizens can pay for balers to clear your field"
                            >
                              🛡️ List on Citizen Charity Portal
                            </button>
                          )}
                          <button
                            onClick={() => { setActiveListing(listing.id); setView('assistance') }}
                            className="px-3 py-1.5 bg-surface border border-surface-border text-copy-primary rounded-lg text-xs font-medium hover:bg-bg-subtle"
                          >
                            Custom Assistance
                          </button>
                        </div>
                      </div>

                      {/* If listing is pooled, display the live PoolProgress! */}
                      {isPooled && (
                        <div className="pt-2 border-t border-surface-border/50">
                          <PoolProgress pool={linkedPool || undefined} />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Section 2: Verified Matching Offers */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-copy-primary">Your Matched Offers</h3>
            {offers.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">No pending offers right now. Offers from buyers and balers will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {offers.map(offer => (
                  <OfferCard 
                    key={offer.id} 
                    offer={offer} 
                    onAccept={async (id) => {
                      await handleOfferAction(id, 'accept')
                      reloadData()
                    }}
                    onDecline={async (id) => {
                      await handleOfferAction(id, 'decline')
                      reloadData()
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Registered Plots & Satellite Verification */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-copy-primary">Your Plots & Satellite Verification</h3>
                <p className="text-xs text-copy-secondary">
                  NASA FIRMS and Sentinel-2 automated checks ensure fields remain clean and fire-free after harvest.
                </p>
              </div>
            </div>

            {plots.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">No plots registered yet. Add a plot in the setup section above.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {plots.map((plot, idx) => (
                  <div key={plot.id} className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-copy-primary text-base">Plot #{idx + 1}</h4>
                        <p className="text-xs text-copy-secondary mt-0.5">{plot.acres} acres registered</p>
                      </div>
                      
                      {/* Interactive Satellite Check Button */}
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-copy-muted uppercase font-semibold">Demo / Live Satellite:</span>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={verifyingPlotId === plot.id}
                            onClick={() => handleRunSatelliteCheck(plot.id, 'verified')}
                            className="px-2 py-1 bg-state-success-dim border border-state-success/30 text-state-success text-[11px] font-semibold rounded-lg hover:bg-state-success hover:text-white transition-all disabled:opacity-50"
                            title="Simulate clear Sentinel-2 NBR pass with 0 FIRMS fire hits"
                          >
                            ✓ Clean Pass
                          </button>
                          <button
                            type="button"
                            disabled={verifyingPlotId === plot.id}
                            onClick={() => handleRunSatelliteCheck(plot.id, 'fire_detected')}
                            className="px-2 py-1 bg-state-error-dim border border-state-error/30 text-state-error text-[11px] font-semibold rounded-lg hover:bg-state-error hover:text-white transition-all disabled:opacity-50"
                            title="Simulate FIRMS thermal fire alert"
                          >
                            🔥 Fire Alert
                          </button>
                          <button
                            type="button"
                            disabled={verifyingPlotId === plot.id}
                            onClick={() => handleRunSatelliteCheck(plot.id, 'inconclusive')}
                            className="px-2 py-1 bg-bg-subtle border border-surface-border text-copy-secondary text-[11px] font-semibold rounded-lg hover:bg-surface transition-all disabled:opacity-50"
                            title="Simulate optical cloud cover"
                          >
                            ☁️ Cloudy
                          </button>
                        </div>
                      </div>
                    </div>

                    <VerificationCard verification={plot.verifications?.[plot.verifications.length - 1]} />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Section 4: Pickups & Instant Payments */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-copy-primary">Your Pickups & Instant Payments</h3>
            {pickups.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">No pickups scheduled yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {pickups.map(pickup => (
                  <PickupCard 
                    key={pickup.id} 
                    pickup={pickup}
                    mode="farmer"
                    onUpdatePayment={async (id, data) => {
                      await updatePickupPayment(id, data)
                      getPickups().then(setPickups)
                    }} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 5: WhatsApp Two-Way Interactive Sandbox & Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-copy-primary">WhatsApp Two-Way Sync Channel</h3>
                <p className="text-xs text-copy-secondary">
                  Farmers can query pickup dates, pool progress, and payment status via WhatsApp. All messages sync to this timeline.
                </p>
              </div>
            </div>

            <WhatsappSimulator 
              userPhone={farmerProfile?.phone || '+919999900001'}
              onMessageSent={reloadData}
            />

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-copy-secondary">Message Activity Timeline</h4>
              {messages.length === 0 ? (
                <div className="bg-surface border border-surface-border rounded-2xl p-5 text-center">
                  <p className="text-copy-secondary text-sm">No WhatsApp messages yet. Use the simulator above to send your first message!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-2xl max-w-sm sm:max-w-md shadow-xs ${
                        msg.direction === 'inbound'
                          ? 'bg-surface border border-surface-border mr-auto'
                          : 'bg-brand text-on-brand ml-auto font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                          {msg.direction === 'inbound' ? 'Farmer via WhatsApp' : 'ResidueLoop Bot'}
                        </span>
                        <span className="text-[10px] opacity-70">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{msg.raw_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
