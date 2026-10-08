import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'

const paymentSchema = z.object({
  payment_status: z.enum(['pending', 'received', 'not_received']),
})

interface PaymentFormProps {
  onSubmit: (data: z.infer<typeof paymentSchema>) => Promise<void>
  onCancel: () => void
}

export function PaymentForm({ onSubmit, onCancel }: PaymentFormProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { payment_status: 'pending' }
  })

  const handleSubmit = async (values: z.infer<typeof paymentSchema>) => {
    setError(null)
    try {
      await onSubmit(values)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {error && <p className="text-state-error text-sm">{error}</p>}
      
      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">{t('pickup.payment_status', 'Payment Status')}</label>
        <select
          {...form.register('payment_status')}
          className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
        >
          <option value="pending">{t('status.pending', 'Pending')}</option>
          <option value="received">{t('status.received', 'Received')}</option>
          <option value="not_received">{t('status.not_received', 'Not Received')}</option>
        </select>
        {form.formState.errors.payment_status && (
          <p className="text-state-error text-sm mt-1">{form.formState.errors.payment_status.message}</p>
        )}
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-2 font-medium border border-surface-border text-copy-secondary hover:bg-bg-subtle"
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="flex-1 bg-brand text-on-brand rounded-xl py-2 font-medium hover:bg-accent-secondary disabled:opacity-50"
        >
          {t('common.save', 'Save')}
        </button>
      </div>
    </form>
  )
}
