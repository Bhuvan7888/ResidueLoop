import { useState, useEffect } from 'react'
import { NewListingForm } from '@/features/listing/components/NewListingForm'
import { createListing, getPlots } from '@/features/listing/api'
import { getOffers, handleOfferAction } from '@/features/matching/api'
import { OfferCard } from '@/features/matching/components/OfferCard'
import { getPickups, updatePickupPayment } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'

export function FarmerDashboard({ userId }: { userId: string }) {
  const [view, setView] = useState<'listing' | 'dashboard'>('dashboard')
  const [plots, setPlots] = useState<{ id: string; acres: number }[]>([])
  const [offers, setOffers] = useState<{ id: string; status: string; price_per_tonne: number }[]>([])
  const [pickups, setPickups] = useState<{ id: string; pool_id: string; actual_tonnes: number | null; amount_due: number | null; payment_status: string; pools: { pickup_date: string | null } }[]>([])

  useEffect(() => {
    getPlots(userId).then(setPlots).catch(console.error)
    getOffers().then(setOffers).catch(console.error)
    getPickups().then(setPickups).catch(console.error)
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

      {view === 'dashboard' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-copy-primary">Your Offers</h3>
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
        </div>
      )}
    </div>
  )
}
