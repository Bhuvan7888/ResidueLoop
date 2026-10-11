import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WeightForm } from './WeightForm'
import { PaymentForm } from './PaymentForm'

interface Pickup {
  id: string
  pool_id: string
  actual_tonnes: number | null
  amount_due: number | null
  payment_status: string
  quality_notes?: string | null
  pools: {
    pickup_date: string | null
  }
}

interface PickupCardProps {
  pickup: Pickup
  mode: 'buyer' | 'farmer'
  onUpdateWeight?: (id: string, data: { actual_tonnes: number; quality_notes?: string }) => Promise<void>
  onUpdatePayment?: (id: string, data: { payment_status: 'pending' | 'received' | 'not_received' }) => Promise<void>
}

export function PickupCard({ pickup, mode, onUpdateWeight, onUpdatePayment }: PickupCardProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4">
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
        <p className="text-xl font-bold text-brand">
          {pickup.amount_due !== null ? `₹${pickup.amount_due.toLocaleString()}` : '-'}
        </p>
      </div>

      {/* Unit 06: Not received is flagged */}
      {pickup.payment_status === 'not_received' && (
        <div className="mb-4 rounded-xl bg-state-error-dim border border-state-error/40 p-3 text-xs text-state-error flex items-start gap-2">
          <span className="text-base leading-none">⚠️</span>
          <div>
            <p className="font-bold">{t('pickup.flagged_title', 'PAYMENT FLAGGED: NOT RECEIVED')}</p>
            <p className="text-[11px] opacity-90 mt-0.5">
              {mode === 'buyer'
                ? 'The farmer reported this payment as not received! Please disburse cash or bank transfer immediately.'
                : t('pickup.flagged_desc_farmer', 'You flagged this payment as not received. The buyer has been alerted to disburse immediately.')}
            </p>
          </div>
        </div>
      )}

      {pickup.payment_status === 'received' && (
        <div className="mb-4 rounded-xl bg-state-success-dim border border-state-success/30 p-2.5 text-xs text-state-success flex items-center gap-2">
          <span>✓</span>
          <span className="font-semibold">{t('pickup.settled_desc', 'Payment settled and verified hand-to-hand.')}</span>
        </div>
      )}

      {mode === 'buyer' && (
        <>
          {!isEditing && pickup.actual_tonnes === null ? (
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
            <div className="bg-bg-subtle p-3 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-copy-secondary">{t('pickup.actual_weight', 'Actual Weight')}</span>
                <span className="text-base font-semibold text-copy-primary">{pickup.actual_tonnes} {t('common.tonne', 't')}</span>
              </div>
              {pickup.quality_notes && (
                <p className="text-xs text-copy-secondary pt-1 border-t border-surface-border/40">
                  <span className="font-medium text-copy-muted">{t('pickup.quality_notes', 'Notes')}:</span> {pickup.quality_notes}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {mode === 'farmer' && (
        <div className="space-y-2">
          <p className="text-xs text-copy-secondary font-medium">{t('pickup.record_status', 'Record Hand-to-Hand Payment Status:')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdatePayment && onUpdatePayment(pickup.id, { payment_status: 'received' })}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                pickup.payment_status === 'received'
                  ? 'bg-state-success text-white cursor-default'
                  : 'bg-surface border border-state-success/40 text-state-success hover:bg-state-success-dim'
              }`}
            >
              <span>✓</span>
              <span>{t('status.received', 'Received')}</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdatePayment && onUpdatePayment(pickup.id, { payment_status: 'not_received' })}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                pickup.payment_status === 'not_received'
                  ? 'bg-state-error text-white cursor-default'
                  : 'bg-surface border border-state-error/40 text-state-error hover:bg-state-error-dim'
              }`}
            >
              <span>✕</span>
              <span>{t('status.not_received', 'Not Received')}</span>
            </button>
          </div>
          {isEditing ? (
            <PaymentForm 
              onSubmit={async (data) => {
                if (onUpdatePayment) await onUpdatePayment(pickup.id, data)
                setIsEditing(false)
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
