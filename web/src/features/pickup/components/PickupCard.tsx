import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WeightForm } from './WeightForm'
import { PaymentForm } from './PaymentForm'
import { SourceBadge } from '@/features/whatsapp/components/SourceBadge'

interface Pickup {
  id: string
  pool_id: string
  weighed_tonnes: number | null
  completed_at: string | null
  listings?: { source: 'web' | 'whatsapp' } | null
  amount_due: number | null
  payment_status: string
  pools: {
    pickup_date: string | null
  }
}

interface PickupCardProps {
  pickup: Pickup
  mode: 'buyer' | 'farmer'
  onUpdateWeight?: (id: string, data: { weighed_tonnes: number }) => Promise<void>
  onComplete?: (id: string) => Promise<void>
  onUpdatePayment?: (id: string, data: { payment_status: 'pending' | 'received' | 'not_received' }) => Promise<void>
}

export function PickupCard({ pickup, mode, onUpdateWeight, onComplete, onUpdatePayment }: PickupCardProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4">
      {pickup.listings && (
        <div className="mb-3">
          <SourceBadge source={pickup.listings.source} />
        </div>
      )}
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-sm text-copy-secondary">{t('pickup.scheduled_date', 'Scheduled Date')}</p>
          <p className="text-base font-medium text-copy-primary">{pickup.pools.pickup_date || t('status.pending', 'Pending')}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-copy-secondary">{t('pickup.status', 'Status')}</p>
          <p className="text-base font-medium text-copy-primary capitalize">{t(`status.${pickup.payment_status}`, pickup.payment_status)}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-copy-secondary">{t('pickup.amount_due', 'Amount Due')}</p>
        <p className="text-base font-medium text-copy-primary">
          {pickup.amount_due !== null ? `₹${pickup.amount_due}` : '-'}
        </p>
      </div>

      {mode === 'buyer' && (
        <>
          {!isEditing && pickup.weighed_tonnes === null ? (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-brand text-on-brand rounded-xl py-2 font-medium hover:bg-accent-secondary"
            >
              {t('pickup.update_weight', 'Update Weighbridge Details')}
            </button>
          ) : isEditing ? (
            <WeightForm 
              onSubmit={async (data) => {
                if (onUpdateWeight) await onUpdateWeight(pickup.id, data)
                setIsEditing(false)
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="space-y-3">
              <div className="bg-bg-subtle p-3 rounded-xl flex justify-between items-center">
                <span className="text-sm text-copy-secondary">{t('pickup.actual_weight', 'Actual Weight')}</span>
                <span className="text-base font-medium text-copy-primary">{pickup.weighed_tonnes} t</span>
              </div>
              {pickup.completed_at === null && onComplete && (
                <button
                  onClick={() => onComplete(pickup.id)}
                  className="w-full bg-brand text-on-brand rounded-xl py-2 font-medium hover:bg-accent-secondary"
                >
                  {t('pickup.mark_complete', 'Mark pickup complete')}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {mode === 'farmer' && (
        <>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-surface text-copy-primary border border-surface-border rounded-xl py-2 font-medium hover:bg-bg-subtle"
            >
              {t('pickup.update_payment', 'Update Payment Status')}
            </button>
          ) : (
            <PaymentForm 
              onSubmit={async (data) => {
                if (onUpdatePayment) await onUpdatePayment(pickup.id, data)
                setIsEditing(false)
              }}
              onCancel={() => setIsEditing(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
