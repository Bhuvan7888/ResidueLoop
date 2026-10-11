import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { APP_CONFIG } from '@/config'
import { useTranslation } from 'react-i18next'
import {
  STUBBLE_MARKET_TIERS,
  QUALITY_GRADES,
  INTENDED_PURPOSES,
  getEstimatedBenchmarkPrice,
} from '../marketTiers'

const listingSchema = z.object({
  plotId: z.string().min(1, 'Please select a plot'),
  harvestDate: z.string().min(1, 'Please select a harvest date'),
  combineSmsUsed: z.boolean(),
  qualityGrade: z.string().min(1, 'Please select stubble quality grade'),
  stubbleForm: z.string().min(1, 'Please select stubble form'),
  intendedPurposes: z.array(z.string()).min(1, 'Please select at least one suitable purpose'),
  expectedPricePerTonne: z.number().min(500, 'Price must be at least ₹500/t'),
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
  const { t, i18n } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof listingSchema>>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      plotId: plots.length === 1 ? plots[0].id : '',
      harvestDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      combineSmsUsed: true,
      qualityGrade: 'grade_a_sms',
      stubbleForm: 'delivered_bales',
      intendedPurposes: ['paper_packaging', 'thermal_power'],
      expectedPricePerTonne: 1850,
    },
  })

  useEffect(() => {
    if (plots.length === 1 && !form.getValues('plotId')) {
      form.setValue('plotId', plots[0].id)
    }
  }, [plots, form])

  const selectedPlotId = form.watch('plotId')
  const qualityGrade = form.watch('qualityGrade')
  const stubbleForm = form.watch('stubbleForm')
  const intendedPurposesWatch = form.watch('intendedPurposes')
  const intendedPurposes = useMemo(() => intendedPurposesWatch || [], [intendedPurposesWatch])
  const expectedPrice = form.watch('expectedPricePerTonne')

  const selectedPlot = plots.find((p) => p.id === selectedPlotId)

  // Calculate estimate using config bounds (2 to 3 tonnes per acre)
  const estMin = selectedPlot ? selectedPlot.acres * APP_CONFIG.yieldPerAcreMin : 0
  const estMax = selectedPlot ? selectedPlot.acres * APP_CONFIG.yieldPerAcreMax : 0
  const estTonnes = (estMin + estMax) / 2 // Average for the DB

  // Dynamic benchmark calculation
  const benchmarkPrice = useMemo(() => {
    return getEstimatedBenchmarkPrice(stubbleForm, qualityGrade, intendedPurposes)
  }, [stubbleForm, qualityGrade, intendedPurposes])

  // Update expected price default when form/grade changes if not dirty
  useEffect(() => {
    form.setValue('expectedPricePerTonne', benchmarkPrice)
  }, [benchmarkPrice, form])

  // Synchronize SMS checkbox with quality grade if Grade A SMS chosen
  const handleQualitySelect = (gradeId: string) => {
    form.setValue('qualityGrade', gradeId)
    if (gradeId === 'grade_a_sms') {
      form.setValue('combineSmsUsed', true)
      if (stubbleForm === 'farm_gate_loose') form.setValue('stubbleForm', 'delivered_bales')
    } else if (gradeId === 'grade_a_plus') {
      if (!intendedPurposes.includes('cattle_feed')) {
        form.setValue('intendedPurposes', [...intendedPurposes, 'cattle_feed'])
      }
      form.setValue('stubbleForm', 'commercial_feed_grade')
    } else if (gradeId === 'grade_b') {
      form.setValue('combineSmsUsed', false)
    }
  }

  const togglePurpose = (purposeId: string) => {
    const current = [...intendedPurposes]
    const idx = current.indexOf(purposeId)
    if (idx >= 0) {
      if (current.length > 1) {
        current.splice(idx, 1)
        form.setValue('intendedPurposes', current)
      }
    } else {
      current.push(purposeId)
      form.setValue('intendedPurposes', current)
    }
  }

  const estimatedTotalPayout = estTonnes * (expectedPrice || benchmarkPrice)
  const activeMarketTier = STUBBLE_MARKET_TIERS[stubbleForm] || STUBBLE_MARKET_TIERS.delivered_bales

  const handleSubmit = async (values: z.infer<typeof listingSchema>) => {
    setError(null)
    try {
      await onSubmit({ ...values, estTonnes })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create listing')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-3xl mx-auto">
      {error && (
        <div className="p-3 rounded-xl bg-state-error-dim border border-state-error/30 text-state-error text-sm font-medium">
          {error}
        </div>
      )}

      {/* Basic Setup: Plot & Date */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
          <span>📍</span> {i18n.language === 'hi' ? '1. खेत और कटाई अनुसूची चुनें' : '1. Select Plot & Harvest Schedule'}
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
              {t('listing.select_plot', 'Registered Plot')}
            </label>
            <select
              {...form.register('plotId')}
              className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none"
            >
              <option value="">{t('listing.select_plot_placeholder', 'Select a plot...')}</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name} ({plot.acres} {t('listing.acres', 'acres')})
                </option>
              ))}
            </select>
            {form.formState.errors.plotId && (
              <p className="text-state-error text-xs mt-1">{form.formState.errors.plotId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-copy-secondary mb-1">
              {t('farmer.expected_harvest', 'Expected Harvest Date')}
            </label>
            <input
              type="date"
              {...form.register('harvestDate')}
              className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-base focus:ring-2 focus:ring-accent-primary outline-none"
            />
            {form.formState.errors.harvestDate && (
              <p className="text-state-error text-xs mt-1">{form.formState.errors.harvestDate.message}</p>
            )}
          </div>
        </div>

        {selectedPlot && (
          <div className="flex items-center justify-between bg-bg-subtle/80 p-3 rounded-xl text-xs border border-surface-border-subtle">
            <span className="text-copy-secondary font-medium">
              {i18n.language === 'hi' ? 'रकबा:' : 'Acreage:'} <strong>{selectedPlot.acres} {t('listing.acres', 'acres')}</strong>
            </span>
            <span className="text-copy-primary font-bold">
              {i18n.language === 'hi' ? 'अनुमानित बायोमास:' : 'Estimated Biomass:'} {estMin.toFixed(1)} – {estMax.toFixed(1)} {t('listing.tonnes', 'tonnes')} (~{estTonnes.toFixed(1)}{t('common.tonne', 't')})
            </span>
          </div>
        )}
      </div>

      {/* Stubble Quality Assessment: How Good is your stubble? */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
            <span>🌾</span> {i18n.language === 'hi' ? '2. पराली गुणवत्ता एवं स्थिति मूल्यांकन' : '2. Stubble Quality & Condition Assessment'}
          </h3>
          <p className="text-xs text-copy-secondary mt-0.5">
            {i18n.language === 'hi'
              ? 'आपकी पराली की गुणवत्ता कैसी है? सटीक नमी और ग्रेडिंग आपको प्रीमियम खरीदारों से जोड़ती है।'
              : 'How good is your stubble? Accurate moisture and grading matches you with premium industrial and dairy buyers.'}
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {QUALITY_GRADES.map((grade) => {
            const isSelected = qualityGrade === grade.id
            return (
              <div
                key={grade.id}
                onClick={() => handleQualitySelect(grade.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-xs'
                    : 'border-surface-border hover:border-brand/40 bg-bg-subtle/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-copy-primary">{grade.shortLabel}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${grade.badgeClass}`}>
                    {grade.moisture}
                  </span>
                </div>
                <p className="text-[11px] text-copy-secondary line-clamp-2 leading-relaxed">
                  {grade.description}
                </p>
                <div className="mt-2 text-[10px] text-brand font-semibold">
                  Typical Market Value: {grade.typicalRange}
                </div>
              </div>
            )
          })}
        </div>

        {/* Combine SMS Toggle */}
        <div className="pt-2 border-t border-surface-border-subtle flex items-center justify-between">
          <div>
            <label htmlFor="combineSmsUsed" className="text-xs font-semibold text-copy-primary block cursor-pointer">
              {i18n.language === 'hi' ? 'कंबाइन में स्ट्रॉ मैनेजमेंट सिस्टम (SMS) लगा है?' : 'Combine equipped with Straw Management System (SMS)?'}
            </label>
            <span className="text-[11px] text-copy-muted">
              {i18n.language === 'hi' ? 'बारीक कटी पराली पेपर मिलों और एनटीपीसी से अधिक दर दिलाती है।' : 'Finely chopped stubble earns higher rates from paper mills and NTPC briquetting tenders.'}
            </span>
          </div>
          <input
            type="checkbox"
            id="combineSmsUsed"
            {...form.register('combineSmsUsed')}
            className="w-4 h-4 rounded border-surface-border text-brand focus:ring-brand cursor-pointer"
          />
        </div>
      </div>

      {/* Stubble Source and Form */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
            <span>📦</span> {i18n.language === 'hi' ? '3. पराली रूप एवं वितरण विधि' : '3. Stubble Form & Delivery Method'}
          </h3>
          <p className="text-xs text-copy-secondary mt-0.5">
            {i18n.language === 'hi'
              ? 'लागत वितरण स्रोत और रूप के अनुसार भिन्न होती है। चुनें कि आपकी पराली कैसे हटाई जाएगी।'
              : 'Cost breakdown varies by source and form. Select how your stubble will be cleared and delivered.'}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(STUBBLE_MARKET_TIERS).map((tier) => {
            const isSelected = stubbleForm === tier.id
            return (
              <div
                key={tier.id}
                onClick={() => form.setValue('stubbleForm', tier.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-xs'
                    : 'border-surface-border hover:border-brand/40 bg-bg-subtle/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{tier.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-copy-primary">{tier.name}</h4>
                    <span className="text-[11px] text-brand font-semibold">{tier.priceUnit}</span>
                  </div>
                </div>
                <p className="text-[11px] text-copy-secondary mt-1">{tier.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Intended Purpose Selection */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
            <span>🎯</span> {i18n.language === 'hi' ? '4. उपयुक्त उपयोग एवं लक्षित उद्योग' : '4. Suitable Uses & Target Industries'}
          </h3>
          <p className="text-xs text-copy-secondary mt-0.5">
            {i18n.language === 'hi'
              ? 'आपकी पराली किन उद्देश्यों के लिए उपयोग हो सकती है? हम आपको सीधे इन उद्योगों से जोड़ते हैं।'
              : 'For what purposes can your stubble be used? We match you directly with buyers in these industries.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {INTENDED_PURPOSES.map((purpose) => {
            const isChecked = intendedPurposes.includes(purpose.id)
            return (
              <button
                key={purpose.id}
                type="button"
                onClick={() => togglePurpose(purpose.id)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-state-success-dim border-state-success text-state-success font-semibold shadow-xs'
                    : 'bg-bg-subtle border-surface-border text-copy-secondary hover:bg-surface'
                }`}
              >
                <span>{purpose.icon}</span>
                <span>{purpose.name}</span>
                <span className="text-[10px] opacity-80 font-normal">({purpose.priceGuide})</span>
                {isChecked && <span className="text-xs">✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Real-Time Price Benchmark & Payout Calculator */}
      <div className="bg-brand/10 border border-brand/40 rounded-2xl p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-text">
              {i18n.language === 'hi' ? 'उचित बाज़ार मूल्य सूचकांक' : 'Fair Market Price Index'} ({activeMarketTier.name})
            </span>
            <h4 className="text-xl font-bold font-display text-copy-primary mt-0.5">
              ₹{benchmarkPrice.toLocaleString()} / {t('common.tonne', 'tonne')} {i18n.language === 'hi' ? 'बेंचमार्क दर' : 'benchmark rate'}
            </h4>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-copy-muted block">
              {t('farmer.est_payout', 'Estimated Total Farmer Payout')}
            </span>
            <span className="text-2xl font-bold font-display text-state-success">
              ₹{Math.round(estimatedTotalPayout).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-brand/20">
          <div>
            <label className="block text-xs font-semibold text-copy-primary mb-1">
              {i18n.language === 'hi' ? 'आपकी इच्छित दर (₹/टन):' : 'Your Desired Listing Rate (₹/tonne):'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                {...form.register('expectedPricePerTonne', { valueAsNumber: true })}
                className="w-full rounded-xl border border-surface-border p-2 bg-surface text-sm font-semibold text-copy-primary focus:ring-2 focus:ring-accent-primary outline-none"
              />
              <button
                type="button"
                onClick={() => form.setValue('expectedPricePerTonne', benchmarkPrice)}
                className="text-xs px-2.5 py-2 rounded-xl bg-surface border border-surface-border text-copy-secondary hover:text-copy-primary whitespace-nowrap"
              >
                {i18n.language === 'hi' ? 'इंडेक्स दर चुनें' : 'Use Index'}
              </button>
            </div>
            {form.formState.errors.expectedPricePerTonne && (
              <p className="text-state-error text-xs mt-1">{form.formState.errors.expectedPricePerTonne.message}</p>
            )}
          </div>

          <div className="text-[11px] text-copy-secondary flex flex-col justify-center space-y-1 bg-surface/60 p-2.5 rounded-xl border border-surface-border-subtle">
            <p>
              📊 <strong>{i18n.language === 'hi' ? 'प्रचलित बाज़ार दायरा:' : 'Prevailing Market Range:'}</strong> {activeMarketTier.priceUnit}
            </p>
            <p>
              ⚡ <strong>{i18n.language === 'hi' ? 'डेटा स्रोत:' : 'Source Data:'}</strong> BiofuelCircle, CEEW, NTPC & IndiaMART indices.
            </p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex space-x-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-2.5 font-medium border border-surface-border text-copy-secondary hover:bg-bg-subtle cursor-pointer text-sm"
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <button
          type="submit"
          disabled={form.formState.isSubmitting || !selectedPlot}
          className="flex-1 bg-brand text-on-brand rounded-xl py-2.5 font-bold hover:bg-accent-secondary disabled:opacity-50 cursor-pointer shadow-sm text-sm"
        >
          {form.formState.isSubmitting
            ? t('listing.confirming', 'Confirming Listing...')
            : i18n.language === 'hi'
            ? 'पराली लिस्टिंग प्रकाशित करें और खरीदार खोजें'
            : i18n.language === 'pa'
            ? 'ਪਰਾਲੀ ਲਿਸਟਿੰਗ ਪ੍ਰਕਾਸ਼ਿਤ ਕਰੋ ਅਤੇ ਖਰੀਦਦਾਰ ਲੱਭੋ'
            : 'Publish Straw Listing & Match Buyers'}
        </button>
      </div>
    </form>
  )
}
