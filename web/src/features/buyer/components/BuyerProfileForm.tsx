import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { APP_CONFIG } from '@/config'
import { useTranslation } from 'react-i18next'
import { MapPin, Building2 } from 'lucide-react'
import { INDUSTRIAL_HUBS } from '../distance'

const buyerProfileSchema = z.object({
  orgName: z.string().min(1, 'Organisation name is required'),
  type: z.enum(['biomass', 'cbg', 'kiln', 'mill']),
  capacity: z.number().min(1, 'Capacity must be positive'),
  pricePerTonne: z.number().min(1, 'Price per tonne must be positive'),
  minLoadTonnes: z.number().min(1, 'Minimum load must be positive'),
})

interface BuyerProfileFormProps {
  initialData?: z.infer<typeof buyerProfileSchema>
  onSubmit: (data: z.infer<typeof buyerProfileSchema> & { lat: number; lng: number }) => Promise<void>
}

export function BuyerProfileForm({ initialData, onSubmit }: BuyerProfileFormProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [selectedHubId, setSelectedHubId] = useState<string>('moga_focal_point')

  const form = useForm<z.infer<typeof buyerProfileSchema>>({
    resolver: zodResolver(buyerProfileSchema),
    defaultValues: initialData || {
      minLoadTonnes: APP_CONFIG.minLoadTonnes,
      type: 'biomass',
    },
  })

  const selectedHub = INDUSTRIAL_HUBS.find((h) => h.id === selectedHubId) || INDUSTRIAL_HUBS[0]

  const handleSubmit = async (values: z.infer<typeof buyerProfileSchema>) => {
    setError(null)
    try {
      await onSubmit({ ...values, lat: selectedHub.lat, lng: selectedHub.lng })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-2xl mx-auto">
      {error && <p className="text-state-error text-sm">{error}</p>}

      <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand" />
          <span>{t('buyer.org_details_title', 'Organisation & Factory Information')}</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
            {t('buyer.org_name', 'Organisation Name')}
          </label>
          <input
            {...form.register('orgName')}
            className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none"
          />
          {form.formState.errors.orgName && (
            <p className="text-state-error text-xs mt-1">{form.formState.errors.orgName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
            {t('buyer.org_type', 'Organisation Type')}
          </label>
          <select
            {...form.register('type')}
            className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none"
          >
            <option value="biomass">{t('buyer.type_biomass', 'Biomass Plant')}</option>
            <option value="cbg">{t('buyer.type_cbg', 'CBG Plant')}</option>
            <option value="kiln">{t('buyer.type_kiln', 'Brick Kiln')}</option>
            <option value="mill">{t('buyer.type_mill', 'Paper Mill')}</option>
          </select>
          {form.formState.errors.type && (
            <p className="text-state-error text-xs mt-1">{form.formState.errors.type.message}</p>
          )}
        </div>

        {/* Factory Plant Location Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
            {t('buyer.factory_location_label', 'Primary Factory / Plant Location')}
          </label>
          <select
            value={selectedHubId}
            onChange={(e) => setSelectedHubId(e.target.value)}
            className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none cursor-pointer"
          >
            {INDUSTRIAL_HUBS.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name} ({hub.district}, {hub.state})
              </option>
            ))}
          </select>

          <div className="mt-2 p-3 bg-brand/5 border border-brand/20 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand shrink-0" />
              <div>
                <span className="font-bold text-copy-primary block">{selectedHub.name}</span>
                <span className="text-[11px] text-copy-secondary">{selectedHub.description}</span>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-copy-muted font-medium shrink-0 pl-2">
              {selectedHub.lat.toFixed(2)}°N, {selectedHub.lng.toFixed(2)}°E
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
          <span>⚖️</span>
          <span>{t('buyer.procurement_capacity_title', 'Annual Biomass Capacity & Pricing')}</span>
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
              {t('buyer.capacity', 'Annual Capacity (tonnes)')}
            </label>
            <input
              type="number"
              {...form.register('capacity', { valueAsNumber: true })}
              className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none"
            />
            {form.formState.errors.capacity && (
              <p className="text-state-error text-xs mt-1">{form.formState.errors.capacity.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
              {t('buyer.price_per_tonne', 'Price per tonne (₹)')}
            </label>
            <input
              type="number"
              {...form.register('pricePerTonne', { valueAsNumber: true })}
              className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none"
            />
            {form.formState.errors.pricePerTonne && (
              <p className="text-state-error text-xs mt-1">{form.formState.errors.pricePerTonne.message}</p>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full bg-brand text-on-brand rounded-xl py-3 font-bold hover:bg-accent-secondary disabled:opacity-50 text-sm cursor-pointer shadow-sm transition-all"
      >
        {form.formState.isSubmitting ? t('common.saving', 'Saving...') : t('buyer.save_profile', 'Save Profile')}
      </button>
    </form>
  )
}
