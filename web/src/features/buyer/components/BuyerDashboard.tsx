import { useState, useEffect } from 'react'
import { BuyerProfileForm } from './BuyerProfileForm'
import { DemandPostForm } from './DemandPostForm'
import { createBuyerProfile, createDemandPost } from '../api'
import { completePickup, getPickups, updatePickupWeight } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'

export function BuyerDashboard() {
  const [view, setView] = useState<'profile' | 'demand' | 'dashboard'>('dashboard')
  const [pickups, setPickups] = useState<{ id: string; pool_id: string; weighed_tonnes: number | null; completed_at: string | null; amount_due: number | null; payment_status: string; pools: { pickup_date: string | null } }[]>([])

  useEffect(() => {
    getPickups().then(setPickups).catch(console.error)
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
                  onComplete={async (id) => {
                    await completePickup(id)
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
