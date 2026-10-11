import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { MapPin, Building2 } from 'lucide-react'
import { STUBBLE_MARKET_TIERS, INTENDED_PURPOSES } from '@/features/listing/marketTiers'
import { INDUSTRIAL_HUBS } from '../distance'

const demandPostSchema = z.object({
  tonnesNeeded: z.number().min(1, 'Tonnes needed must be positive'),
  pricePerTonne: z.number().min(500, 'Price per tonne must be at least ₹500/t'),
  dateFrom: z.string().min(1, 'Start date is required'),
  dateTo: z.string().min(1, 'End date is required'),
  targetPurpose: z.string().min(1, 'Please select your industry purpose'),
  requiredForm: z.string().min(1, 'Please select required stubble form'),
  minQualityGrade: z.string().optional(),
})

interface DemandPostFormProps {
  onSubmit: (data: z.infer<typeof demandPostSchema> & { lat: number; lng: number }) => Promise<void>
  onCancel: () => void
}

export function DemandPostForm({ onSubmit, onCancel }: DemandPostFormProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  // Factory Location state
  const [selectedHubId, setSelectedHubId] = useState<string>('moga_focal_point')
  const [isCustomLocation, setIsCustomLocation] = useState<boolean>(false)
  const [customLat, setCustomLat] = useState<number>(30.82)
  const [customLng, setCustomLng] = useState<number>(75.17)
  const [customPlantName, setCustomPlantName] = useState<string>('')

  const form = useForm<z.infer<typeof demandPostSchema>>({
    resolver: zodResolver(demandPostSchema),
    defaultValues: {
      tonnesNeeded: 50,
      pricePerTonne: 1850,
      dateFrom: new Date().toISOString().split('T')[0],
      dateTo: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      targetPurpose: 'paper_packaging',
      requiredForm: 'delivered_bales',
      minQualityGrade: 'grade_a_sms',
    },
  })

  const targetPurpose = form.watch('targetPurpose')
  const requiredForm = form.watch('requiredForm')
  const tonnesNeeded = form.watch('tonnesNeeded')
  const pricePerTonne = form.watch('pricePerTonne')

  // Find active market tier based on form
  const activeTier = STUBBLE_MARKET_TIERS[requiredForm] || STUBBLE_MARKET_TIERS.delivered_bales

  // When purpose changes, update form and suggested price
  const handlePurposeSelect = (purposeId: string) => {
    form.setValue('targetPurpose', purposeId)
    const purpose = INTENDED_PURPOSES.find((p) => p.id === purposeId)
    if (purpose) {
      form.setValue('requiredForm', purpose.marketTierId)
      form.setValue('pricePerTonne', purpose.benchmark)
    }
  }

  const selectedHub = INDUSTRIAL_HUBS.find((h) => h.id === selectedHubId) || INDUSTRIAL_HUBS[0]
  const finalLat = isCustomLocation ? customLat : selectedHub.lat
  const finalLng = isCustomLocation ? customLng : selectedHub.lng

  const totalContractValue = (tonnesNeeded || 0) * (pricePerTonne || 0)

  const handleSubmit = async (values: z.infer<typeof demandPostSchema>) => {
    setError(null)
    try {
      await onSubmit({ ...values, lat: finalLat, lng: finalLng })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save demand post')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-2xl mx-auto">
      {error && (
        <div className="p-3 rounded-xl bg-state-error-dim border border-state-error/30 text-state-error text-sm font-medium">
          {error}
        </div>
      )}

      {/* Target Industry & Purpose Selection */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
            <span>🏭</span> {t('buyer.demand_step1', '1. Your Industry & Purpose for Paddy Straw')}
          </h3>
          <p className="text-xs text-copy-secondary mt-0.5">
            {t('buyer.demand_step1_desc', 'We match your purchase tender with farmers possessing matching stubble quality and form.')}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {INTENDED_PURPOSES.map((purpose) => {
            const isSelected = targetPurpose === purpose.id
            return (
              <div
                key={purpose.id}
                onClick={() => handlePurposeSelect(purpose.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-xs'
                    : 'border-surface-border hover:border-brand/40 bg-bg-subtle/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{purpose.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-copy-primary">{purpose.name}</h4>
                    <span className="text-[10px] text-brand font-semibold">{purpose.priceGuide}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Required Stubble Form */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
            <span>📦</span> {t('buyer.demand_step2', '2. Required Delivery Form')}
          </h3>
          <p className="text-xs text-copy-secondary mt-0.5">
            {t('buyer.demand_step2_desc', 'Select the form and packaging required by your boiler, paper mill, or livestock feed facility.')}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(STUBBLE_MARKET_TIERS).map((tier) => {
            const isSelected = requiredForm === tier.id
            return (
              <div
                key={tier.id}
                onClick={() => {
                  form.setValue('requiredForm', tier.id)
                  form.setValue('pricePerTonne', tier.benchmarkPrice)
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-xs'
                    : 'border-surface-border hover:border-brand/40 bg-bg-subtle/30'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-copy-primary flex items-center gap-1.5">
                    <span>{tier.icon}</span> {tier.shortName}
                  </span>
                </div>
                <p className="text-[11px] text-brand font-semibold">{tier.priceUnit}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 3: Factory / Plant Location */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand" />
              <span>{t('buyer.factory_location_title', '3. Your Factory / Processing Plant Location')}</span>
            </h3>
            <p className="text-xs text-copy-secondary mt-0.5">
              {t(
                'buyer.factory_location_desc',
                'We calculate road and field distances from this facility to show you the nearest available farmers.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCustomLocation(!isCustomLocation)}
            className="text-xs text-brand font-semibold hover:underline cursor-pointer"
          >
            {isCustomLocation
              ? t('buyer.select_from_clusters', '← Pick from Industrial Clusters')
              : t('buyer.custom_gps', '+ Custom GPS Coordinates')}
          </button>
        </div>

        {!isCustomLocation ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary">
              {t('buyer.select_industrial_cluster', 'Select Regional Industrial Hub / District')}
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

            <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl flex items-center justify-between text-xs">
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
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
                {t('buyer.plant_name_label', 'Plant / Boiler Facility Name')}
              </label>
              <input
                type="text"
                value={customPlantName}
                onChange={(e) => setCustomPlantName(e.target.value)}
                placeholder="e.g. Moga Agro Pellet Plant #2"
                className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
                  {t('buyer.latitude', 'Latitude')}
                </label>
                <input
                  type="number"
                  step="any"
                  value={customLat}
                  onChange={(e) => setCustomLat(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
                  {t('buyer.longitude', 'Longitude')}
                </label>
                <input
                  type="number"
                  step="any"
                  value={customLng}
                  onChange={(e) => setCustomLng(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Volume & Price Tender */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
            <span>⚖️</span> {t('buyer.demand_step4', '4. Volume and Offer Price')}
          </h3>
          <p className="text-xs text-copy-secondary mt-0.5">
            {t('buyer.demand_step3_desc', 'Set your target volume and offer price per tonne based on regional Punjab market benchmarks.')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
              {t('buyer.tonnes_needed', 'Tonnes Needed')}
            </label>
            <input
              type="number"
              {...form.register('tonnesNeeded', { valueAsNumber: true })}
              className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none"
            />
            {form.formState.errors.tonnesNeeded && (
              <p className="text-state-error text-xs mt-1">{form.formState.errors.tonnesNeeded.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
              {t('buyer.price_per_tonne', 'Offer Price (₹/tonne)')}
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

        {/* Market Pricing Guide Banner */}
        <div className="p-3 bg-brand/10 border border-brand/30 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-copy-primary block">
              {t('buyer.market_index_for', 'Market Index for {{tier}}:', { tier: activeTier.name })}
            </span>
            <span className="text-brand font-bold">{activeTier.priceUnit}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-copy-muted block uppercase font-semibold">
              {t('buyer.est_total_contract', 'Total Tender Value')}
            </span>
            <span className="text-base font-bold font-display text-state-success">
              ₹{Math.round(totalContractValue).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Procurement Window */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
              {t('buyer.date_from', 'Start Date')}
            </label>
            <input
              type="date"
              {...form.register('dateFrom')}
              className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none"
            />
            {form.formState.errors.dateFrom && (
              <p className="text-state-error text-xs mt-1">{form.formState.errors.dateFrom.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
              {t('buyer.date_to', 'End Date')}
            </label>
            <input
              type="date"
              {...form.register('dateTo')}
              className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none"
            />
            {form.formState.errors.dateTo && (
              <p className="text-state-error text-xs mt-1">{form.formState.errors.dateTo.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex space-x-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-2.5 font-medium border border-surface-border text-copy-secondary hover:bg-bg-subtle text-sm cursor-pointer"
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="flex-1 bg-brand text-on-brand rounded-xl py-2.5 font-bold hover:bg-accent-secondary disabled:opacity-50 text-sm cursor-pointer shadow-sm"
        >
          {form.formState.isSubmitting ? t('common.saving', 'Publishing...') : t('buyer.post_tender', 'Publish Industry Demand Tender')}
        </button>
      </div>
    </form>
  )
}
