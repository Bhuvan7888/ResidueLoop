import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const demandPostSchema = z.object({
  tonnesNeeded: z.number().min(1, 'Tonnes needed must be positive'),
  pricePerTonne: z.number().min(1, 'Price per tonne must be positive'),
  dateFrom: z.string().min(1, 'Start date is required'),
  dateTo: z.string().min(1, 'End date is required'),
})

interface DemandPostFormProps {
  onSubmit: (data: z.infer<typeof demandPostSchema> & { lat: number, lng: number }) => Promise<void>
  onCancel: () => void
}

export function DemandPostForm({ onSubmit, onCancel }: DemandPostFormProps) {
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<z.infer<typeof demandPostSchema>>({
    resolver: zodResolver(demandPostSchema),
  })

  const handleSubmit = async (values: z.infer<typeof demandPostSchema>) => {
    setError(null)
    try {
      // Mock location
      await onSubmit({ ...values, lat: 30.9, lng: 75.8 })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save demand post')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {error && <p className="text-state-error text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">Tonnes Needed</label>
        <input
          type="number"
          {...form.register('tonnesNeeded', { valueAsNumber: true })}
          className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
        />
        {form.formState.errors.tonnesNeeded && (
          <p className="text-state-error text-sm mt-1">{form.formState.errors.tonnesNeeded.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">Price per tonne (₹)</label>
        <input
          type="number"
          {...form.register('pricePerTonne', { valueAsNumber: true })}
          className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
        />
        {form.formState.errors.pricePerTonne && (
          <p className="text-state-error text-sm mt-1">{form.formState.errors.pricePerTonne.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-copy-primary mb-1">Start Date</label>
          <input
            type="date"
            {...form.register('dateFrom')}
            className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
          />
          {form.formState.errors.dateFrom && (
            <p className="text-state-error text-sm mt-1">{form.formState.errors.dateFrom.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-copy-primary mb-1">End Date</label>
          <input
            type="date"
            {...form.register('dateTo')}
            className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
          />
          {form.formState.errors.dateTo && (
            <p className="text-state-error text-sm mt-1">{form.formState.errors.dateTo.message}</p>
          )}
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-2 font-medium border border-surface-border text-copy-secondary hover:bg-bg-subtle"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="flex-1 bg-brand text-on-brand rounded-xl py-2 font-medium hover:bg-accent-secondary disabled:opacity-50"
        >
          {form.formState.isSubmitting ? 'Saving...' : 'Post Demand'}
        </button>
      </div>
    </form>
  )
}
