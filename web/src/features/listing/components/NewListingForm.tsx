import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { APP_CONFIG } from '@/config'

const listingSchema = z.object({
  plotId: z.string().min(1, 'Please select a plot'),
  harvestDate: z.string().min(1, 'Please select a harvest date'),
  combineSmsUsed: z.boolean(),
})

interface Plot {
  id: string
  name: string
  acres: number
}

interface NewListingFormProps {
  plots: Plot[]
  onSubmit: (data: z.infer<typeof listingSchema> & { estTonnes: number }) => Promise<void>
  onCancel: () => void
}

export function NewListingForm({ plots, onSubmit, onCancel }: NewListingFormProps) {
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<z.infer<typeof listingSchema>>({
    resolver: zodResolver(listingSchema),
    defaultValues: { combineSmsUsed: false }
  })

  const selectedPlotId = form.watch('plotId')
  const selectedPlot = plots.find(p => p.id === selectedPlotId)
  
  // Calculate estimate using config bounds (2 to 3 tonnes per acre)
  const estMin = selectedPlot ? selectedPlot.acres * APP_CONFIG.yieldPerAcreMin : 0
  const estMax = selectedPlot ? selectedPlot.acres * APP_CONFIG.yieldPerAcreMax : 0
  const estTonnes = (estMin + estMax) / 2 // Average for the DB

  const handleSubmit = async (values: z.infer<typeof listingSchema>) => {
    setError(null)
    try {
      await onSubmit({ ...values, estTonnes })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create listing')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {error && <p className="text-state-error text-sm">{error}</p>}
      
      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">Select Plot</label>
        <select
          {...form.register('plotId')}
          className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
        >
          <option value="">Select a plot...</option>
          {plots.map(plot => (
            <option key={plot.id} value={plot.id}>{plot.name} ({plot.acres} acres)</option>
          ))}
        </select>
        {form.formState.errors.plotId && (
          <p className="text-state-error text-sm mt-1">{form.formState.errors.plotId.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">Expected Harvest Date</label>
        <input
          type="date"
          {...form.register('harvestDate')}
          className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
        />
        {form.formState.errors.harvestDate && (
          <p className="text-state-error text-sm mt-1">{form.formState.errors.harvestDate.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="combineSmsUsed"
          {...form.register('combineSmsUsed')}
          className="rounded border-surface-border text-accent-primary focus:ring-accent-primary"
        />
        <label htmlFor="combineSmsUsed" className="text-sm font-medium text-copy-primary">
          Combine with SMS (Straw Management System) used?
        </label>
      </div>

      {selectedPlot && (
        <div className="bg-bg-subtle p-4 rounded-xl">
          <p className="text-sm text-copy-secondary font-medium">Estimated Yield</p>
          <p className="text-2xl font-display text-copy-primary mt-1">
            {estMin.toFixed(1)} - {estMax.toFixed(1)} tonnes
          </p>
          <p className="text-xs text-copy-muted mt-1 uppercase tracking-wide">Estimate</p>
        </div>
      )}

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
          disabled={form.formState.isSubmitting || !selectedPlot}
          className="flex-1 bg-brand text-on-brand rounded-xl py-2 font-medium hover:bg-accent-secondary disabled:opacity-50"
        >
          {form.formState.isSubmitting ? 'Confirming...' : 'Confirm Listing'}
        </button>
      </div>
    </form>
  )
}
