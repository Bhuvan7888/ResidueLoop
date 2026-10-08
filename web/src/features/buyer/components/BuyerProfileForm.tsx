import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { APP_CONFIG } from '@/config'
import { useTranslation } from 'react-i18next'

const buyerProfileSchema = z.object({
  orgName: z.string().min(1, 'Organisation name is required'),
  type: z.enum(['biomass', 'cbg', 'kiln', 'mill']),
  capacity: z.number().min(1, 'Capacity must be positive'),
  pricePerTonne: z.number().min(1, 'Price per tonne must be positive'),
  minLoadTonnes: z.number().min(1, 'Minimum load must be positive'),
})

interface BuyerProfileFormProps {
  initialData?: z.infer<typeof buyerProfileSchema>
  onSubmit: (data: z.infer<typeof buyerProfileSchema> & { lat: number, lng: number }) => Promise<void>
}

export function BuyerProfileForm({ initialData, onSubmit }: BuyerProfileFormProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<z.infer<typeof buyerProfileSchema>>({
    resolver: zodResolver(buyerProfileSchema),
    defaultValues: initialData || {
      minLoadTonnes: APP_CONFIG.minLoadTonnes,
      type: 'biomass'
    }
  })

  const handleSubmit = async (values: z.infer<typeof buyerProfileSchema>) => {
    setError(null)
    try {
      // Mock location for hackathon build
      await onSubmit({ ...values, lat: 30.9, lng: 75.8 })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {error && <p className="text-state-error text-sm">{error}</p>}
      
      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">{t('buyer.org_name', 'Organisation Name')}</label>
        <input
          {...form.register('orgName')}
          className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
        />
        {form.formState.errors.orgName && (
          <p className="text-state-error text-sm mt-1">{form.formState.errors.orgName.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">{t('buyer.org_type', 'Organisation Type')}</label>
        <select
          {...form.register('type')}
          className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
        >
          <option value="biomass">{t('buyer.type_biomass', 'Biomass Plant')}</option>
          <option value="cbg">{t('buyer.type_cbg', 'CBG Plant')}</option>
          <option value="kiln">{t('buyer.type_kiln', 'Brick Kiln')}</option>
          <option value="mill">{t('buyer.type_mill', 'Paper Mill')}</option>
        </select>
        {form.formState.errors.type && (
          <p className="text-state-error text-sm mt-1">{form.formState.errors.type.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">{t('buyer.capacity', 'Annual Capacity (tonnes)')}</label>
        <input
          type="number"
          {...form.register('capacity', { valueAsNumber: true })}
          className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
        />
        {form.formState.errors.capacity && (
          <p className="text-state-error text-sm mt-1">{form.formState.errors.capacity.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">{t('buyer.price_per_tonne', 'Price per tonne (₹)')}</label>
        <input
          type="number"
          {...form.register('pricePerTonne', { valueAsNumber: true })}
          className="w-full rounded-xl border border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
        />
        {form.formState.errors.pricePerTonne && (
          <p className="text-state-error text-sm mt-1">{form.formState.errors.pricePerTonne.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full bg-brand text-on-brand rounded-xl py-2 font-medium hover:bg-accent-secondary disabled:opacity-50"
      >
        {form.formState.isSubmitting ? t('common.saving', 'Saving...') : t('buyer.save_profile', 'Save Profile')}
      </button>
    </form>
  )
}
