import { useState, useEffect } from 'react'
import { NewListingForm } from '@/features/listing/components/NewListingForm'
import { createListing, getPlots, getListings } from '@/features/listing/api'
import { getOffers, handleOfferAction } from '@/features/matching/api'
import { OfferCard } from '@/features/matching/components/OfferCard'
import { getPickups, updatePickupPayment } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'
import { VerificationCard } from '@/features/verification/components/VerificationCard'

import { ActivityTimeline } from '@/features/whatsapp/components/ActivityTimeline'
import { AssistanceRequestForm } from '@/features/charity/components/AssistanceRequestForm'

export function FarmerDashboard({ userId }: { userId: string }) {
  const [view, setView] = useState<'listing' | 'dashboard' | 'assistance'>('dashboard')
  const [activeListing, setActiveListing] = useState<string | null>(null)
  const [listings, setListings] = useState<{ id: string; acres: number; status: string; harvest_date: string }[]>([])
  const [plots, setPlots] = useState<{ id: string; acres: number; verifications?: { verdict: 'verified' | 'fire_detected' | 'inconclusive'; firms_hits: number; nbr_delta: number; confidence: string; checked_at: string }[] }[]>([])
  const [offers, setOffers] = useState<{ id: string; status: string; price_per_tonne: number }[]>([])
  const [pickups, setPickups] = useState<{ id: string; pool_id: string; weighed_tonnes: number | null; completed_at: string | null; amount_due: number | null; payment_status: string; pools: { pickup_date: string | null } }[]>([])

  useEffect(() => {
    getPlots(userId).then(setPlots).catch(console.error)
    getOffers().then(setOffers).catch(console.error)
    getPickups().then(setPickups).catch(console.error)
    getListings().then(setListings).catch(console.error)
  }, [userId])

  return (
    <div className="space-y-6">
      <div className="flex space-x-4">
        <button onClick={() => setView('listing')} className="px-4 py-2 bg-brand text-on-brand rounded-xl font-medium">New Listing</button>
        <button onClick={() => setView('dashboard')} className="px-4 py-2 bg-surface border border-surface-border rounded-xl font-medium">Back</button>
      </div>

      {view === 'listing' && (
        <NewListingForm 
          plots={plots.map(p => ({ id: p.id, name: 'Plot', acres: p.acres }))}
          onSubmit={async (data) => {
            await createListing(data)
            setView('dashboard')
          }} 
          onCancel={() => setView('dashboard')} 
        />
      )}

      {view === 'assistance' && activeListing && (
        <AssistanceRequestForm 
          listingId={activeListing}
          onSubmit={() => setView('dashboard')}
          onCancel={() => setView('dashboard')}
        />
      )}

      {view === 'dashboard' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-copy-primary">Your Listings</h3>
          <div className="grid gap-4">
            {listings.map(listing => (
              <div key={listing.id} className="bg-surface border border-surface-border rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-copy-primary">{listing.acres} acres - {listing.status}</p>
                  <p className="text-sm text-copy-secondary">Harvest: {listing.harvest_date}</p>
                </div>
                <button onClick={() => { setActiveListing(listing.id); setView('assistance') }} className="px-3 py-1 bg-brand text-on-brand rounded-lg text-sm">Request Support</button>
              </div>
            ))}
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
                  }}
                  onDecline={async (id) => {
                    await handleOfferAction(id, 'decline')
                    getOffers().then(setOffers)
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

          <ActivityTimeline />
        </div>
      )}
    </div>
  )
}
