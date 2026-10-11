import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NewListingForm } from '@/features/listing/components/NewListingForm'
import { createListing, getPlots, getListings } from '@/features/listing/api'
import { getOffers, handleOfferAction } from '@/features/matching/api'
import { OfferCard } from '@/features/matching/components/OfferCard'
import { getPickups, updatePickupPayment } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'
import { VerificationCard } from '@/features/verification/components/VerificationCard'
import { getNotifications, requestAssistance } from '@/features/charity/api'
import { getMessages } from '@/features/whatsapp/api'
import { AssistanceRequestForm } from '@/features/charity/components/AssistanceRequestForm'

export function FarmerDashboard({ userId }: { userId: string }) {
  const [view, setView] = useState<'listing' | 'dashboard' | 'assistance'>('dashboard')
  const [activeListing, setActiveListing] = useState<string | null>(null)
  const [listings, setListings] = useState<{ id: string; acres?: number; status: string; harvest_date: string; source: string; created_at?: string; plots?: { acres: number }; est_tonnes?: number }[]>([])
  
  const { data: plots = [] } = useQuery({
    queryKey: ['plots', userId],
    queryFn: () => getPlots(userId),
    enabled: !!userId,
  })

  const [offers, setOffers] = useState<{ id: string; status: string; price_per_tonne: number }[]>([])
  const [pickups, setPickups] = useState<{ id: string; pool_id: string; actual_tonnes: number | null; amount_due: number | null; payment_status: string; pools: { pickup_date: string | null } }[]>([])
  const [messages, setMessages] = useState<{ id: string; direction: string; raw_text: string; created_at: string }[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const reloadData = () => {
    getOffers().then(setOffers).catch(console.error)
    getPickups().then(setPickups).catch(console.error)
    getListings(userId).then(setListings).catch(console.error)
    getMessages(userId).then(setMessages).catch(console.error)
    if (userId) {
      getNotifications(userId).then(setNotifications).catch(console.error)
    }
  }

  useEffect(() => {
    reloadData()
    const interval = setInterval(reloadData, 3500)
    return () => clearInterval(interval)
  }, [userId])

  const handleQuickCharityList = async (listingId: string) => {
    try {
      await requestAssistance({ listing_id: listingId, purpose: 'Urgent citizen crowdfunding clearance to avoid burning' })
      setActionMsg('🌾 Stubble successfully listed on the Citizen Charity Crowdfunding Portal!')
      reloadData()
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to list on charity portal')
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

      {/* Sync Status & Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex space-x-3">
          {view === 'dashboard' && (
            <button onClick={() => setView('listing')} className="px-4 py-2 bg-brand text-on-brand rounded-xl font-medium shadow-xs hover:bg-accent-secondary transition-all">New Listing</button>
          )}
          {view !== 'dashboard' && (
            <button onClick={() => setView('dashboard')} className="px-4 py-2 bg-surface border border-surface-border rounded-xl font-medium">Back</button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-copy-secondary bg-surface border border-surface-border px-3 py-1.5 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
          <span className="font-medium text-copy-primary">Live Sync Active</span>
          <span>•</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-mono font-medium">🔒 E2E Encrypted</span>
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
            <p className="text-copy-secondary text-sm">Please register at least one plot in the "Your Plots" section above before creating a listing.</p>
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
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-copy-primary">Your Listings</h3>
          <div className="grid gap-4">
            {listings.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6">
                <p className="text-copy-secondary">No listings created yet. Click "New Listing" above to create one.</p>
              </div>
            ) : (
              listings.map(listing => {
                const acresDisplay = listing.acres ?? listing.plots?.acres ?? (listing.est_tonnes ? (listing.est_tonnes / 2.5).toFixed(1) : '?')
                const isUnsold = listing.status === 'open'
                const isMatched = listing.status === 'matched'
                const isPooled = listing.status === 'pooled'
                const isCompleted = listing.status === 'completed'

                return (
                  <div key={listing.id} className="bg-surface border border-surface-border rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <p className="font-semibold text-copy-primary">{acresDisplay} acres • {listing.est_tonnes ? `${listing.est_tonnes.toFixed(1)}t` : ''}</p>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          isMatched || isPooled ? 'bg-state-success-dim text-state-success' :
                          isCompleted ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {isUnsold ? 'Unsold (In Marketplace)' : listing.status}
                        </span>
                        {listing.source === 'whatsapp' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">via WhatsApp</span>
                        )}
                        {isUnsold && (
                          <span className="px-2 py-0.5 bg-state-error-dim text-state-error text-xs rounded-full font-medium">
                            🔥 Burning Risk if Unsold &gt; 2 Days
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-copy-secondary mt-1">Harvest Date: {listing.harvest_date}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isUnsold && (
                        <button
                          type="button"
                          onClick={() => handleQuickCharityList(listing.id)}
                          className="px-3 py-1.5 bg-state-error text-white rounded-lg text-xs font-semibold hover:opacity-90 shadow-xs"
                          title="List on Charity Crowdfunding so normal citizens can pay for balers to clear your field"
                        >
                          🛡️ List on Charity Crowdfunding Portal
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
                )
              })
            )}
          </div>

          <h3 className="text-lg font-medium text-copy-primary mt-8">Your Offers</h3>
          {offers.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-2xl p-6">
              <p className="text-copy-secondary">Farmer Dashboard - Listings and Offers will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {offers.map(offer => (
                <OfferCard 
                  key={offer.id} 
                  offer={offer} 
                  onAccept={async (id) => {
                    await handleOfferAction(id, 'accept')
                    getOffers().then(setOffers)
                    getListings(userId).then(setListings)
                    getPickups().then(setPickups)
                  }}
                  onDecline={async (id) => {
                    await handleOfferAction(id, 'decline')
                    getOffers().then(setOffers)
                    getListings(userId).then(setListings)
                  }}
                />
              ))}
            </div>
          )}
          <h3 className="text-lg font-medium text-copy-primary mt-8">Your Plots & Verifications</h3>
          <div className="grid gap-4">
            {plots.map(plot => (
              <div key={plot.id} className="bg-surface border border-surface-border rounded-2xl p-4">
                <p className="font-medium text-copy-primary mb-2">Plot ({plot.acres} acres)</p>
                <VerificationCard verification={plot.verifications?.[0]} />
              </div>
            ))}
          </div>
          
          <h3 className="text-lg font-medium text-copy-primary mt-8">Your Pickups</h3>
          {pickups.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-2xl p-6">
              <p className="text-copy-secondary">No pickups yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
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

          <h3 className="text-lg font-medium text-copy-primary mt-8">WhatsApp Messages</h3>
          {messages.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-2xl p-6">
              <p className="text-copy-secondary">No messages yet. Send a message to start!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`p-3 rounded-xl max-w-sm ${msg.direction === 'inbound' ? 'bg-surface border border-surface-border mr-auto' : 'bg-brand text-on-brand ml-auto'}`}>
                  <p className="text-sm">{msg.raw_text}</p>
                  <p className="text-xs opacity-70 mt-1">{new Date(msg.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
