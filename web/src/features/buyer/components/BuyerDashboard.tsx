import { useState, useEffect } from 'react'
import { BuyerProfileForm } from './BuyerProfileForm'
import { DemandPostForm } from './DemandPostForm'
import { createBuyerProfile, createDemandPost } from '../api'
import { getPickups, updatePickupWeight } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'
import { getListings } from '@/features/listing/api'

export function BuyerDashboard() {
  const [view, setView] = useState<'profile' | 'demand' | 'dashboard'>('dashboard')
  const [pickups, setPickups] = useState<{ id: string; pool_id: string; actual_tonnes: number | null; amount_due: number | null; payment_status: string; pools: { pickup_date: string | null } }[]>([])
  const [listings, setListings] = useState<{ id: string; acres: number; status: string; harvest_date: string; source: string }[]>([])

  useEffect(() => {
    getPickups().then(setPickups).catch(console.error)
    getListings().then(setListings).catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex space-x-4">
        <button onClick={() => setView('profile')} className="px-4 py-2 bg-brand text-on-brand rounded-xl font-medium">Edit Profile</button>
        <button onClick={() => setView('demand')} className="px-4 py-2 bg-brand text-on-brand rounded-xl font-medium">Post Demand</button>
        <button onClick={() => setView('dashboard')} className="px-4 py-2 bg-surface border border-surface-border rounded-xl font-medium">Back</button>
      </div>

      {view === 'profile' && (
        <BuyerProfileForm onSubmit={async (data) => {
          await createBuyerProfile(data)
          setView('dashboard')
        }} />
      )}

      {view === 'demand' && (
        <DemandPostForm onSubmit={async (data) => {
          await createDemandPost(data)
          setView('dashboard')
        }} onCancel={() => setView('dashboard')} />
      )}

      {view === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-surface border border-surface-border rounded-2xl p-6">
            <p className="text-copy-secondary">Buyer Dashboard - Demand Posts will appear here.</p>
          </div>

          <h3 className="text-lg font-medium text-copy-primary mt-8">Available Supply (Listings)</h3>
          {listings.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-2xl p-6">
              <p className="text-copy-secondary">No listings available right now.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {listings.map(listing => (
                <div key={listing.id} className="bg-surface border border-surface-border rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-copy-primary">{listing.acres} acres - {listing.status}</p>
                      {listing.source === 'whatsapp' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">via WhatsApp</span>
                      )}
                    </div>
                    <p className="text-sm text-copy-secondary">Harvest: {listing.harvest_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="text-lg font-medium text-copy-primary">Your Pickups</h3>
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
                  mode="buyer"
                  onUpdateWeight={async (id, data) => {
                    await updatePickupWeight(id, data)
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
