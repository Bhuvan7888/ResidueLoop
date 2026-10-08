import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTranslation } from 'react-i18next'

import { useState, useEffect } from 'react'
import { BuyerProfileForm } from '@/features/buyer/components/BuyerProfileForm'
import { DemandPostForm } from '@/features/buyer/components/DemandPostForm'
import { NewListingForm } from '@/features/listing/components/NewListingForm'
import { createBuyerProfile, createDemandPost } from '@/features/buyer/api'
import { createListing, getPlots } from '@/features/listing/api'

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

  useEffect(() => {
    getPlots(userId).then(setPlots).catch(console.error)
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
        <div className="bg-surface border border-surface-border rounded-2xl p-6">
          <p className="text-copy-secondary">Farmer Dashboard - Listings and Offers will appear here.</p>
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
    </div>
  )
}
