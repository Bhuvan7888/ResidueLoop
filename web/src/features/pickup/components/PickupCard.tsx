import { useState } from 'react'
import { PickupForm } from './PickupForm'

interface Pickup {
  id: string
  pool_id: string
  actual_tonnes: number | null
  payment_status: string
  pools: {
    pickup_date: string | null
  }
}

interface PickupCardProps {
  pickup: Pickup
  onUpdate: (id: string, data: { actual_tonnes: number, payment_status: string }) => Promise<void>
}

export function PickupCard({ pickup, onUpdate }: PickupCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4">
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-sm text-copy-secondary">Scheduled Date</p>
          <p className="text-base font-medium text-copy-primary">{pickup.pools.pickup_date || 'Pending'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-copy-secondary">Status</p>
          <p className="text-base font-medium text-copy-primary capitalize">{pickup.payment_status}</p>
        </div>
      </div>

      {!isEditing && pickup.actual_tonnes === null ? (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full bg-brand text-on-brand rounded-xl py-2 font-medium hover:bg-accent-secondary"
        >
          Update Weighbridge Details
        </button>
      ) : isEditing ? (
        <PickupForm 
          onSubmit={async (data) => {
            await onUpdate(pickup.id, data)
            setIsEditing(false)
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="bg-bg-subtle p-3 rounded-xl flex justify-between items-center">
          <span className="text-sm text-copy-secondary">Actual Weight</span>
          <span className="text-base font-medium text-copy-primary">{pickup.actual_tonnes} t</span>
        </div>
      )}
    </div>
  )
}
