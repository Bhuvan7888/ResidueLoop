import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'

const weightSchema = z.object({
  actual_tonnes: z.number().min(0.1, 'Must be greater than 0'),
})

interface WeightFormProps {
  onSubmit: (data: z.infer<typeof weightSchema>) => Promise<void>
  onCancel: () => void
}

export function WeightForm({ onSubmit, onCancel }: WeightFormProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<z.infer<typeof weightSchema>>({
    resolver: zodResolver(weightSchema),
  })

  const handleSubmit = async (values: z.infer<typeof weightSchema>) => {
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
        <label className="block text-sm font-medium text-copy-primary mb-1">{t('pickup.actual_weight', 'Actual Weight (tonnes)')}</label>
        <input
          type="number"
          step="0.1"
          {...form.register('actual_tonnes', { valueAsNumber: true })}
          className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
        />
        {form.formState.errors.actual_tonnes && (
          <p className="text-state-error text-sm mt-1">{form.formState.errors.actual_tonnes.message}</p>
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
