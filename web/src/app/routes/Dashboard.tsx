import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTranslation } from 'react-i18next'

import { useState, useEffect } from 'react'
import { BuyerProfileForm } from '@/features/buyer/components/BuyerProfileForm'
import { DemandPostForm } from '@/features/buyer/components/DemandPostForm'
import { NewListingForm } from '@/features/listing/components/NewListingForm'
import { createBuyerProfile, createDemandPost } from '@/features/buyer/api'
import { createListing, getPlots } from '@/features/listing/api'
import { getOffers, handleOfferAction } from '@/features/matching/api'
import { OfferCard } from '@/features/matching/components/OfferCard'
import { getPickups, updatePickup } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'

function BuyerDashboard() {
  const [view, setView] = useState<'profile' | 'demand' | 'dashboard'>('dashboard')

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
        <div className="bg-surface border border-surface-border rounded-2xl p-6">
          <p className="text-copy-secondary">Buyer Dashboard - Demand Posts will appear here.</p>
        </div>
      )}
    </div>
  )
}

function FarmerDashboard({ userId }: { userId: string }) {
  const [view, setView] = useState<'listing' | 'dashboard'>('dashboard')
  const [plots, setPlots] = useState<{ id: string; acres: number }[]>([])
  const [offers, setOffers] = useState<{ id: string; status: string; price_per_tonne: number }[]>([])

  useEffect(() => {
    getPlots(userId).then(setPlots).catch(console.error)
    getOffers().then(setOffers).catch(console.error)
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
        </div>
      )}
    </div>
  )
}

function BalerDashboard() {
  const [pickups, setPickups] = useState<{ id: string; pool_id: string; actual_tonnes: number | null; payment_status: string; pools: { pickup_date: string | null } }[]>([])

  useEffect(() => {
    getPickups().then(setPickups).catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-copy-primary">Your Pickups</h3>
      {pickups.length === 0 ? (
        <div className="bg-surface border border-surface-border rounded-2xl p-6">
          <p className="text-copy-secondary">Baler Dashboard - Assigned pickups will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pickups.map(pickup => (
            <PickupCard 
              key={pickup.id} 
              pickup={pickup} 
              onUpdate={async (id, data) => {
                await updatePickup(id, data)
                getPickups().then(setPickups)
              }} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Dashboard() {
  const { role, session } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display text-copy-primary">
        {t('dashboard.welcome_msg', { role, id: session?.user.id })}
      </h2>
      
      {role === 'buyer' && <BuyerDashboard />}
      {role === 'farmer' && <FarmerDashboard userId={session?.user.id || ''} />}
      {role === 'baler' && <BalerDashboard />}
    </div>
  )
}
