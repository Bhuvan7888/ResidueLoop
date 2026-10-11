import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { APP_CONFIG } from '@/config'
import { useTranslation } from 'react-i18next'
import { getEstimatedBenchmarkPrice } from '../marketTiers'

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

type HarvestTimingKey = 'now' | '1wk' | '2wk' | 'custom'
type StrawConditionKey = 'standing' | 'chopped' | 'baled'

export function NewListingForm({ plots, onSubmit, onCancel }: NewListingFormProps) {
  const { t, i18n } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [showAdvancedPrice, setShowAdvancedPrice] = useState(false)
  const [selectedTiming, setSelectedTiming] = useState<HarvestTimingKey>('1wk')
  const [selectedCondition, setSelectedCondition] = useState<StrawConditionKey>('chopped')

  const form = useForm<z.infer<typeof listingSchema>>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      plotId: plots.length === 1 ? plots[0].id : '',
      harvestDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      combineSmsUsed: true,
      qualityGrade: 'grade_a_sms',
      stubbleForm: 'delivered_bales',
      intendedPurposes: ['paper_packaging', 'thermal_power'],
      expectedPricePerTonne: 1950,
    },
  })

  useEffect(() => {
    if (plots.length === 1 && !form.getValues('plotId')) {
      form.setValue('plotId', plots[0].id)
    }
  }, [plots, form])

  const selectedPlotId = form.watch('plotId')
  const selectedPlot = plots.find((p) => p.id === selectedPlotId) || plots[0]

  // Zero-Math Calculator: calculate yield & estimated range
  const acres = selectedPlot ? selectedPlot.acres : 5
  const estMin = acres * APP_CONFIG.yieldPerAcreMin
  const estMax = acres * APP_CONFIG.yieldPerAcreMax
  const estTonnes = (estMin + estMax) / 2

  // Benchmark price calculation
  const stubbleForm = form.watch('stubbleForm')
  const qualityGrade = form.watch('qualityGrade')
  const intendedPurposesWatch = form.watch('intendedPurposes')
  const intendedPurposes = useMemo(() => intendedPurposesWatch || [], [intendedPurposesWatch])
  const expectedPrice = form.watch('expectedPricePerTonne')

  const benchmarkPrice = useMemo(() => {
    return getEstimatedBenchmarkPrice(stubbleForm, qualityGrade, intendedPurposes)
  }, [stubbleForm, qualityGrade, intendedPurposes])

  useEffect(() => {
    form.setValue('expectedPricePerTonne', benchmarkPrice)
  }, [benchmarkPrice, form])

  const minPayout = Math.round(estMin * (expectedPrice || benchmarkPrice))
  const maxPayout = Math.round(estMax * (expectedPrice || benchmarkPrice))

  // Handle 3 Harvest Timing Picture Cards
  const handleTimingSelect = (timing: HarvestTimingKey) => {
    setSelectedTiming(timing)
    const today = new Date()
    if (timing === 'now') {
      const tomorrow = new Date(today.getTime() + 86400000)
      form.setValue('harvestDate', tomorrow.toISOString().split('T')[0])
      setShowCustomDate(false)
    } else if (timing === '1wk') {
      const inOneWeek = new Date(today.getTime() + 86400000 * 7)
      form.setValue('harvestDate', inOneWeek.toISOString().split('T')[0])
      setShowCustomDate(false)
    } else if (timing === '2wk') {
      const inTwoWeeks = new Date(today.getTime() + 86400000 * 14)
      form.setValue('harvestDate', inTwoWeeks.toISOString().split('T')[0])
      setShowCustomDate(false)
    } else if (timing === 'custom') {
      setShowCustomDate(true)
    }
  }

  // Handle 3 Straw Condition Visual Picture Cards
  const handleConditionSelect = (cond: StrawConditionKey) => {
    setSelectedCondition(cond)
    if (cond === 'standing') {
      // Standing in field: loose straw, buyer will cut and bale
      form.setValue('stubbleForm', 'farm_gate_loose')
      form.setValue('qualityGrade', 'grade_b')
      form.setValue('combineSmsUsed', false)
      form.setValue('intendedPurposes', ['biomass_plant', 'thermal_power', 'brick_kiln'])
      form.setValue('expectedPricePerTonne', 1600)
    } else if (cond === 'chopped') {
      // Chopped by combine SMS
      form.setValue('stubbleForm', 'delivered_bales')
      form.setValue('qualityGrade', 'grade_a_sms')
      form.setValue('combineSmsUsed', true)
      form.setValue('intendedPurposes', ['paper_packaging', 'thermal_power', 'briquettes_pellets'])
      form.setValue('expectedPricePerTonne', 1950)
    } else if (cond === 'baled') {
      // Already baled
      form.setValue('stubbleForm', 'delivered_bales')
      form.setValue('qualityGrade', 'grade_a_plus')
      form.setValue('combineSmsUsed', false)
      form.setValue('intendedPurposes', ['cattle_feed', 'paper_packaging', 'bio_cng'])
      form.setValue('expectedPricePerTonne', 2200)
    }
  }

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
        <div className="p-4 rounded-2xl bg-state-error-dim border border-state-error/30 text-state-error text-sm font-semibold flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} className="text-xs uppercase font-bold">✕</button>
        </div>
      )}

      {/* ================= STEP 1: PLOT & HARVEST SCHEDULE ================= */}
      <div className="bg-surface border-2 border-surface-border rounded-3xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">चरण 1 / Step 1</span>
            <h3 className="text-xl font-bold text-copy-primary mt-0.5">
              📍 {t('farmer.step_1_title', '1. Select Plot & Harvest Time')}
            </h3>
          </div>
          {plots.length > 1 && (
            <span className="text-xs bg-bg-subtle px-3 py-1 rounded-full text-copy-secondary font-medium border border-surface-border">
              {plots.length} {t('farmer.plots_title', 'Registered Plots')}
            </span>
          )}
        </div>

        {/* Plot Selection (if multiple plots) */}
        {plots.length > 1 ? (
          <div>
            <label className="block text-xs font-bold uppercase text-copy-secondary mb-2">
              {t('listing.select_plot', 'खेत चुनें / Select Plot')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {plots.map((plot) => {
                const isSelected = (selectedPlotId || plots[0].id) === plot.id
                return (
                  <button
                    key={plot.id}
                    type="button"
                    onClick={() => form.setValue('plotId', plot.id)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand bg-brand/10 ring-2 ring-brand/30 shadow-xs'
                        : 'border-surface-border bg-bg-subtle/50 hover:border-brand/40'
                    }`}
                  >
                    <div className="font-bold text-sm text-copy-primary">{plot.name}</div>
                    <div className="text-xs text-brand font-semibold mt-0.5">{plot.acres} {t('listing.acres', 'acres')}</div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-bg-subtle border border-surface-border">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌾</span>
              <div>
                <span className="text-xs text-copy-secondary font-medium">पंजीकृत खेत / Registered Plot:</span>
                <div className="font-bold text-sm text-copy-primary">{selectedPlot?.name || 'खेत #1'} ({acres} {t('listing.acres', 'acres')})</div>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-state-success-dim text-state-success font-semibold border border-state-success/30">
              ✓ चयनित
            </span>
          </div>
        )}

        {/* ================= ZERO-MATH LIVE CALCULATOR ================= */}
        <div className="bg-state-success-dim/70 border-2 border-state-success/40 rounded-3xl p-5 text-center space-y-2 shadow-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-state-success text-white text-[11px] font-bold uppercase tracking-wider">
            ✨ {t('farmer.calculator_title', 'Zero-Math Automatic Estimate')}
          </div>
          <div className="text-xl sm:text-2xl font-black text-copy-primary pt-1">
            🌾 {t('farmer.est_straw', 'Estimated Stubble')}: ~{estMin.toFixed(0)} {t('common.to', 'से')} {estMax.toFixed(0)} {t('listing.tonnes', 'टन')}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-state-success">
            💵 {t('farmer.est_earnings', 'Estimated Earnings')}: ₹{minPayout.toLocaleString('en-IN')} – ₹{maxPayout.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-copy-secondary pt-1 font-medium">
            🛡️ {t('farmer.no_math_guarantee', 'कटाई व उठान पर सीधे बैंक खाते में पूरा भुगतान।')}
          </p>
        </div>

        {/* ================= HARVEST TIMING (3 PICTURE CARDS) ================= */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold uppercase text-copy-secondary">
            🗓️ कटाई का समय / Harvest Time
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Ready Now */}
            <button
              type="button"
              onClick={() => handleTimingSelect('now')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedTiming === 'now'
                  ? 'border-state-success bg-state-success-dim ring-2 ring-state-success/40 shadow-xs'
                  : 'border-surface-border bg-bg-subtle/50 hover:border-state-success/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🟢</span>
                {selectedTiming === 'now' && <span className="text-xs font-bold text-state-success">✓ चुना गया</span>}
              </div>
              <div>
                <h4 className="font-bold text-sm text-copy-primary">
                  {t('farmer.harvest_now_title', 'आज / कल तैयार')}
                </h4>
                <p className="text-xs text-copy-secondary mt-0.5">
                  {t('farmer.harvest_now_desc', 'तुरंत उठान हेतु तैयार')}
                </p>
              </div>
            </button>

            {/* Card 2: Within 1 Week */}
            <button
              type="button"
              onClick={() => handleTimingSelect('1wk')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedTiming === '1wk'
                  ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-xs'
                  : 'border-surface-border bg-bg-subtle/50 hover:border-brand/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🟡</span>
                {selectedTiming === '1wk' && <span className="text-xs font-bold text-brand">✓ चुना गया</span>}
              </div>
              <div>
                <h4 className="font-bold text-sm text-copy-primary">
                  {t('farmer.harvest_1wk_title', '1 हफ्ते में')}
                </h4>
                <p className="text-xs text-copy-secondary mt-0.5">
                  {t('farmer.harvest_1wk_desc', 'अगले 7 दिनों में कटाई')}
                </p>
              </div>
            </button>

            {/* Card 3: Within 2 Weeks */}
            <button
              type="button"
              onClick={() => handleTimingSelect('2wk')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedTiming === '2wk'
                  ? 'border-accent-primary bg-accent-primary/10 ring-2 ring-accent-primary/40 shadow-xs'
                  : 'border-surface-border bg-bg-subtle/50 hover:border-accent-primary/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🔵</span>
                {selectedTiming === '2wk' && <span className="text-xs font-bold text-accent-primary">✓ चुना गया</span>}
              </div>
              <div>
                <h4 className="font-bold text-sm text-copy-primary">
                  {t('farmer.harvest_2wk_title', '2 हफ्ते में')}
                </h4>
                <p className="text-xs text-copy-secondary mt-0.5">
                  {t('farmer.harvest_2wk_desc', '14 दिनों के अंदर कटाई')}
                </p>
              </div>
            </button>
          </div>

          {/* Optional Custom Date Link */}
          <div className="pt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setShowCustomDate(!showCustomDate)
                if (!showCustomDate) setSelectedTiming('custom')
              }}
              className="text-xs text-brand font-semibold hover:underline cursor-pointer"
            >
              📅 {t('farmer.custom_date_toggle', 'अन्य तारीख चुनें')}
            </button>
            <span className="text-xs text-copy-muted font-mono">
              तारीख: {form.watch('harvestDate')}
            </span>
          </div>

          {showCustomDate && (
            <div className="mt-2 p-3 bg-bg-subtle rounded-2xl border border-surface-border">
              <input
                type="date"
                {...form.register('harvestDate')}
                className="w-full rounded-xl border border-surface-border p-2.5 text-sm bg-surface font-semibold text-copy-primary outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          )}
        </div>
      </div>

      {/* ================= STEP 2: STRAW CONDITION (3 PICTURE CARDS) ================= */}
      <div className="bg-surface border-2 border-surface-border rounded-3xl p-6 space-y-4 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand">चरण 2 / Step 2</span>
          <h3 className="text-xl font-bold text-copy-primary mt-0.5">
            🌾 {t('farmer.step_2_title', '2. Straw Condition')}
          </h3>
          <p className="text-xs text-copy-secondary mt-1">
            {i18n.language === 'hi' 
              ? 'आपकी पराली किस स्थिति में है? सही विकल्प चुनते ही उचित खरीदार से मिलान होगा।' 
              : 'Choose condition. Matches directly with suitable balers, paper mills & power plants.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Standing in Field */}
          <div
            onClick={() => handleConditionSelect('standing')}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              selectedCondition === 'standing'
                ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-sm scale-[1.01]'
                : 'border-surface-border bg-bg-subtle/40 hover:border-brand/40'
            }`}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl mb-3">
                🌾
              </div>
              <h4 className="font-bold text-base text-copy-primary">
                {t('farmer.condition_standing_title', 'खड़ी पराली')}
              </h4>
              <p className="text-xs text-copy-secondary mt-1.5 leading-relaxed">
                {t('farmer.condition_standing_desc', 'खरीदार खुद मशीन से काटेगा और गांठें बनाएगा')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-border-subtle flex items-center justify-between">
              <span className="text-xs font-bold text-brand">~₹1,500 - ₹1,700/t</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${selectedCondition === 'standing' ? 'bg-brand text-on-brand' : 'bg-surface text-copy-muted'}`}>
                {selectedCondition === 'standing' ? '✓ चुना' : 'चुनें'}
              </span>
            </div>
          </div>

          {/* Card 2: Chopped by SMS */}
          <div
            onClick={() => handleConditionSelect('chopped')}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              selectedCondition === 'chopped'
                ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-sm scale-[1.01]'
                : 'border-surface-border bg-bg-subtle/40 hover:border-brand/40'
            }`}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl mb-3">
                🚜
              </div>
              <h4 className="font-bold text-base text-copy-primary">
                {t('farmer.condition_chopped_title', 'कटी हुई पराली')}
              </h4>
              <p className="text-xs text-copy-secondary mt-1.5 leading-relaxed">
                {t('farmer.condition_chopped_desc', 'कंबाइन एसएमएस से बारीक कटी हुई')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-border-subtle flex items-center justify-between">
              <span className="text-xs font-bold text-state-success">~₹1,800 - ₹2,100/t</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${selectedCondition === 'chopped' ? 'bg-brand text-on-brand' : 'bg-surface text-copy-muted'}`}>
                {selectedCondition === 'chopped' ? '✓ चुना' : 'चुनें'}
              </span>
            </div>
          </div>

          {/* Card 3: Already Baled */}
          <div
            onClick={() => handleConditionSelect('baled')}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              selectedCondition === 'baled'
                ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-sm scale-[1.01]'
                : 'border-surface-border bg-bg-subtle/40 hover:border-brand/40'
            }`}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-2xl mb-3">
                📦
              </div>
              <h4 className="font-bold text-base text-copy-primary">
                {t('farmer.condition_baled_title', 'गांठें तैयार')}
              </h4>
              <p className="text-xs text-copy-secondary mt-1.5 leading-relaxed">
                {t('farmer.condition_baled_desc', 'गांठें बंधी तैयार हैं, तुरंत लोडिंग हेतु')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-border-subtle flex items-center justify-between">
              <span className="text-xs font-bold text-accent-primary">~₹2,100 - ₹2,400/t</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${selectedCondition === 'baled' ? 'bg-brand text-on-brand' : 'bg-surface text-copy-muted'}`}>
                {selectedCondition === 'baled' ? '✓ चुना' : 'चुनें'}
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Price Toggle */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvancedPrice(!showAdvancedPrice)}
            className="text-xs text-copy-secondary hover:text-copy-primary flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <span>⚙️</span> {t('farmer.custom_price_toggle', 'उन्नत दर विकल्प')} {showAdvancedPrice ? '▲' : '▼'}
          </button>

          {showAdvancedPrice && (
            <div className="mt-3 p-4 bg-bg-subtle rounded-2xl border border-surface-border space-y-3">
              <label className="block text-xs font-semibold text-copy-primary">
                इच्छित दर / Desired Rate (₹/tonne):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  {...form.register('expectedPricePerTonne', { valueAsNumber: true })}
                  className="rounded-xl border border-surface-border p-2 bg-surface text-sm font-bold text-copy-primary outline-none focus:ring-2 focus:ring-brand w-48"
                />
                <button
                  type="button"
                  onClick={() => form.setValue('expectedPricePerTonne', benchmarkPrice)}
                  className="text-xs px-3 py-2 rounded-xl bg-surface border border-surface-border text-copy-secondary hover:text-copy-primary"
                >
                  बेंचमार्क दर रीसेट करें (₹{benchmarkPrice})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= SUBMIT & CANCEL BUTTONS ================= */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl py-3 px-6 font-semibold border-2 border-surface-border text-copy-secondary hover:bg-bg-subtle cursor-pointer text-sm order-2 sm:order-1"
        >
          {t('common.cancel', 'Cancel')}
        </button>

        <button
          type="submit"
          disabled={form.formState.isSubmitting || !selectedPlot}
          className="flex-1 bg-brand text-on-brand rounded-2xl py-4 px-6 text-base font-extrabold hover:bg-accent-secondary disabled:opacity-50 cursor-pointer shadow-md transition-transform hover:scale-[1.01] order-1 sm:order-2 text-center"
        >
          {form.formState.isSubmitting
            ? t('listing.confirming', 'Confirming Listing...')
            : i18n.language === 'hi'
            ? '🌾 पराली लिस्ट करें और खरीदार पाएं'
            : i18n.language === 'pa'
            ? '🌾 ਪਰਾਲੀ ਲਿਸਟ ਕਰੋ ਅਤੇ ਖਰੀਦਦਾਰ ਲੱਭੋ'
            : '🌾 Publish Straw Listing & Match Buyers'}
        </button>
      </div>
    </form>
  )
}
