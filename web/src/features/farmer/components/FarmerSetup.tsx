import { useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { createFarmerPlot, createFarmerProfile, getFarmerProfile, submitIdVerification } from '@/features/farmer/api'
import { useAuth } from '@/features/auth/hooks/useAuth'

interface Village {
  district: string
  id: string
  name: string
  geometry?: {
    type: string
    coordinates: [number, number]
  }
}

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  villageId: z.string().min(1, 'Please select a village'),
})

const plotSchema = z.object({
  acres: z
    .string()
    .min(1, 'Acres is required')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 500, 'Enter valid acres (0.1 - 500)'),
  villageId: z.string().min(1, 'Please select a village'),
  lat: z.string().optional(),
  lng: z.string().optional(),
})

const documentSchema = z.object({
  consent: z.boolean().refine((v) => v === true, 'Consent is required'),
  file: z.instanceof(File, { message: 'Document file is required' }),
  idLast4: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits'),
  idType: z.string().trim().min(1, 'ID type is required').max(40),
})

async function getVillages(): Promise<Village[]> {
  const { data, error } = await supabase.from('villages').select('id,name,district,geometry').order('name')
  if (error) throw error
  return data ?? []
}

function SetupCard({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <section className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-copy-primary">{title}</h3>
        {subtitle && <p className="text-xs text-copy-secondary mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

export function FarmerSetup() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { i18n, t } = useTranslation()

  const userId = session?.user.id || ''

  const { data: farmerProfile } = useQuery({
    queryFn: () => getFarmerProfile(userId),
    queryKey: ['farmerProfile', userId],
    enabled: !!userId,
  })

  const villages = useQuery({ queryFn: getVillages, queryKey: ['villages'] })
  const villageOptions = useMemo(() => villages.data ?? [], [villages.data])

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', villageId: '' },
  })

  const plotForm = useForm<z.infer<typeof plotSchema>>({
    defaultValues: { acres: '', lat: '30.82', lng: '75.171', villageId: '' },
    resolver: zodResolver(plotSchema),
  })

  const documentForm = useForm<z.infer<typeof documentSchema>>({
    defaultValues: { consent: false, idLast4: '', idType: 'Aadhaar' },
    resolver: zodResolver(documentSchema),
  })

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { reset: resetProfile, formState: { isDirty: isProfileDirty } } = profileForm
  const { setValue: setPlotValue, getValues: getPlotValues } = plotForm

  // Populate profile form only on initial profile load, without resetting while dirty
  useEffect(() => {
    if (farmerProfile?.name || farmerProfile?.villageId) {
      if (!isProfileDirty) {
        resetProfile({
          name: farmerProfile.name || '',
          villageId: farmerProfile.villageId || '',
        })
      }
    }
  }, [farmerProfile?.name, farmerProfile?.villageId, isProfileDirty, resetProfile])

  // Sync village to plot form if plot village not selected yet
  useEffect(() => {
    if (farmerProfile?.villageId && !getPlotValues('villageId')) {
      setPlotValue('villageId', farmerProfile.villageId)
      const matched = villageOptions.find((v) => v.id === farmerProfile.villageId)
      if (matched?.geometry?.coordinates) {
        setPlotValue('lng', String(matched.geometry.coordinates[0]))
        setPlotValue('lat', String(matched.geometry.coordinates[1]))
      }
    }
  }, [farmerProfile?.villageId, getPlotValues, setPlotValue, villageOptions])

  const onProfileVillageSelect = (villageId: string) => {
    profileForm.setValue('villageId', villageId, { shouldValidate: true })
    if (!plotForm.getValues('villageId')) {
      plotForm.setValue('villageId', villageId, { shouldValidate: true })
      const v = villageOptions.find((opt) => opt.id === villageId)
      if (v?.geometry?.coordinates) {
        plotForm.setValue('lng', String(v.geometry.coordinates[0]))
        plotForm.setValue('lat', String(v.geometry.coordinates[1]))
      }
    }
  }

  const onPlotVillageSelect = (villageId: string) => {
    plotForm.setValue('villageId', villageId, { shouldValidate: true })
    const v = villageOptions.find((opt) => opt.id === villageId)
    if (v?.geometry?.coordinates) {
      plotForm.setValue('lng', String(v.geometry.coordinates[0]))
      plotForm.setValue('lat', String(v.geometry.coordinates[1]))
    }
  }

  const submitProfile = async (values: z.infer<typeof profileSchema>) => {
    setFeedback(null)
    try {
      await createFarmerProfile({ ...values, language: i18n.language === 'pa' ? 'pa' : 'en' })
      setFeedback({ type: 'success', text: t('farmer.profile_saved') || 'Profile saved successfully!' })
      await queryClient.invalidateQueries({ queryKey: ['farmerProfile', userId] })
      plotForm.setValue('villageId', values.villageId)
      const v = villageOptions.find((opt) => opt.id === values.villageId)
      if (v?.geometry?.coordinates) {
        plotForm.setValue('lng', String(v.geometry.coordinates[0]))
        plotForm.setValue('lat', String(v.geometry.coordinates[1]))
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save profile' })
    }
  }

  const submitPlot = async (values: z.infer<typeof plotSchema>) => {
    setFeedback(null)
    const village = villageOptions.find((v) => v.id === values.villageId)
    const defaultLng = village?.geometry?.coordinates?.[0] ?? 75.171
    const defaultLat = village?.geometry?.coordinates?.[1] ?? 30.82
    const lat = values.lat && values.lat.trim() ? Number(values.lat) : defaultLat
    const lng = values.lng && values.lng.trim() ? Number(values.lng) : defaultLng

    try {
      await createFarmerPlot({
        villageId: values.villageId,
        acres: Number(values.acres),
        lat,
        lng,
      })
      setFeedback({ type: 'success', text: t('farmer.plot_saved') || 'Plot added successfully! See it under Your Plots.' })
      plotForm.reset({ acres: '', lat: String(lat), lng: String(lng), villageId: values.villageId })
      await queryClient.invalidateQueries({ queryKey: ['plots', userId] })
    } catch (err: unknown) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save plot' })
    }
  }

  const submitDocument = async (values: z.infer<typeof documentSchema>) => {
    setFeedback(null)
    try {
      const result = await submitIdVerification(values)
      setFeedback({ type: 'success', text: t('farmer.id_status', { status: result.status }) })
      await queryClient.invalidateQueries({ queryKey: ['farmerProfile', userId] })
    } catch (err: unknown) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Failed to submit ID verification' })
    }
  }

  if (villages.isLoading) return <p className="text-copy-secondary">{t('common.loading')}</p>
  if (villages.isError) return <p className="text-state-error">{t('farmer.villages_error')}</p>

  const idStatus = farmerProfile?.idStatus || 'not_submitted'

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="landing-eyebrow">{t('farmer.setup_eyebrow')}</p>
          <h3 className="text-2xl font-display text-copy-primary">{t('farmer.setup_title')}</h3>
          <p className="mt-1 text-copy-secondary">{t('farmer.setup_body')}</p>
        </div>
        <div className="self-start sm:self-auto">
          {idStatus === 'verified' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-state-success-dim text-state-success border border-state-success/30 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
              ID Verified Farmer
            </span>
          )}
          {idStatus === 'pending' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              ID Verification Pending
            </span>
          )}
          {idStatus === 'rejected' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-state-error-dim text-state-error border border-state-error/30">
              <span className="w-2 h-2 rounded-full bg-state-error"></span>
              ID Rejected
            </span>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-state-success-dim text-state-success border border-state-success/30'
              : 'bg-state-error-dim text-state-error border border-state-error/30'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === 'success' ? '✓' : '⚠️'}</span>
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold uppercase tracking-wider opacity-75 hover:opacity-100 ml-4 px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Card 1: Farmer Profile */}
      <SetupCard
        title={t('farmer.profile_title')}
        subtitle="Set your name and home village for stubble matching"
      >
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={profileForm.handleSubmit(submitProfile)}>
          <label className="text-sm text-copy-primary block">
            {t('farmer.name')} <span className="text-state-error">*</span>
            <input
              className="mt-1 w-full rounded-xl border border-surface-border p-2.5 focus:ring-2 focus:ring-accent-primary outline-none bg-surface"
              placeholder="e.g. Gurpreet Singh"
              {...profileForm.register('name')}
            />
            {profileForm.formState.errors.name && (
              <p className="text-state-error text-xs mt-1">{profileForm.formState.errors.name.message}</p>
            )}
          </label>
          <label className="text-sm text-copy-primary block">
            {t('farmer.village')} <span className="text-state-error">*</span>
            <select
              className="mt-1 w-full rounded-xl border border-surface-border bg-surface p-2.5 focus:ring-2 focus:ring-accent-primary outline-none"
              value={profileForm.watch('villageId') || ''}
              onChange={(e) => onProfileVillageSelect(e.target.value)}
            >
              <option value="">Select your village...</option>
              {villageOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}, {v.district}
                </option>
              ))}
            </select>
            {profileForm.formState.errors.villageId && (
              <p className="text-state-error text-xs mt-1">{profileForm.formState.errors.villageId.message}</p>
            )}
          </label>
          <button
            type="submit"
            className="self-end rounded-xl bg-brand px-5 py-2.5 font-medium text-on-brand disabled:opacity-50 hover:bg-accent-secondary active:scale-[0.99] transition-all cursor-pointer shadow-xs"
            disabled={profileForm.formState.isSubmitting}
          >
            {profileForm.formState.isSubmitting ? t('common.loading') : t('farmer.save_profile')}
          </button>
        </form>
      </SetupCard>

      {/* Card 2: Register Plot */}
      <SetupCard
        title={t('farmer.plot_title')}
        subtitle="Add your field plots to list stubble for local biomass buyers"
      >
        <form className="space-y-3" onSubmit={plotForm.handleSubmit(submitPlot)}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-copy-primary block">
              {t('farmer.village')} <span className="text-state-error">*</span>
              <select
                className="mt-1 w-full rounded-xl border border-surface-border bg-surface p-2.5 focus:ring-2 focus:ring-accent-primary outline-none"
                value={plotForm.watch('villageId') || ''}
                onChange={(e) => onPlotVillageSelect(e.target.value)}
              >
                <option value="">Select plot village...</option>
                {villageOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}, {v.district}
                  </option>
                ))}
              </select>
              {plotForm.formState.errors.villageId && (
                <p className="text-state-error text-xs mt-1">{plotForm.formState.errors.villageId.message}</p>
              )}
            </label>
            <label className="text-sm text-copy-primary block">
              {t('farmer.acres')} <span className="text-state-error">*</span>
              <input
                className="mt-1 w-full rounded-xl border border-surface-border p-2.5 focus:ring-2 focus:ring-accent-primary outline-none bg-surface"
                step="0.1"
                type="number"
                placeholder="e.g. 10.5"
                {...plotForm.register('acres')}
              />
              {plotForm.formState.errors.acres && (
                <p className="text-state-error text-xs mt-1">{plotForm.formState.errors.acres.message}</p>
              )}
            </label>
            <button
              type="submit"
              className="self-end rounded-xl bg-brand px-5 py-2.5 font-medium text-on-brand disabled:opacity-50 hover:bg-accent-secondary active:scale-[0.99] transition-all cursor-pointer shadow-xs"
              disabled={plotForm.formState.isSubmitting}
            >
              {plotForm.formState.isSubmitting ? t('common.loading') : t('farmer.add_plot')}
            </button>
          </div>

          <details className="text-xs text-copy-secondary pt-1">
            <summary className="cursor-pointer hover:text-copy-primary font-medium select-none">
              GPS Coordinates (Auto-derived from village)
            </summary>
            <div className="grid grid-cols-2 gap-3 mt-2 p-3 bg-bg-subtle rounded-xl border border-surface-border">
              <label className="block">
                <span>Latitude</span>
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border p-2 bg-surface"
                  step="0.0001"
                  type="number"
                  {...plotForm.register('lat')}
                />
              </label>
              <label className="block">
                <span>Longitude</span>
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border p-2 bg-surface"
                  step="0.0001"
                  type="number"
                  {...plotForm.register('lng')}
                />
              </label>
            </div>
          </details>
        </form>
      </SetupCard>

      {/* Card 3: ID Verification */}
      {idStatus !== 'verified' && (
        <SetupCard
          title={t('farmer.id_title')}
          subtitle="Verify your identity to enable automatic listing creation and instant payouts"
        >
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={documentForm.handleSubmit(submitDocument)}>
            <label className="text-sm text-copy-primary block">
              {t('farmer.id_type')}
              <input
                className="mt-1 w-full rounded-xl border border-surface-border p-2.5 focus:ring-2 focus:ring-accent-primary outline-none"
                placeholder="Aadhaar / Voter ID"
                {...documentForm.register('idType')}
              />
              {documentForm.formState.errors.idType && (
                <p className="text-state-error text-xs mt-1">{documentForm.formState.errors.idType.message}</p>
              )}
            </label>
            <label className="text-sm text-copy-primary block">
              {t('farmer.last_four')}
              <input
                className="mt-1 w-full rounded-xl border border-surface-border p-2.5 focus:ring-2 focus:ring-accent-primary outline-none"
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
                {...documentForm.register('idLast4')}
              />
              {documentForm.formState.errors.idLast4 && (
                <p className="text-state-error text-xs mt-1">{documentForm.formState.errors.idLast4.message}</p>
              )}
            </label>
            <label className="text-sm text-copy-primary block">
              {t('farmer.document')}
              <input
                className="mt-1 block w-full text-sm text-copy-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-surface-border file:text-copy-primary hover:file:bg-copy-muted/20"
                accept="image/jpeg,image/png,application/pdf"
                type="file"
                onChange={(event) =>
                  documentForm.setValue('file', event.target.files?.[0] as File, { shouldValidate: true })
                }
              />
              {documentForm.formState.errors.file && (
                <p className="text-state-error text-xs mt-1">{documentForm.formState.errors.file.message}</p>
              )}
            </label>
            <label className="flex items-start gap-2 text-sm text-copy-secondary sm:col-span-2 mt-2">
              <input className="mt-1 rounded" type="checkbox" {...documentForm.register('consent')} />
              <span>{t('farmer.consent')}</span>
            </label>
            {documentForm.formState.errors.consent && (
              <p className="text-state-error text-xs sm:col-span-2">{documentForm.formState.errors.consent.message}</p>
            )}
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-2.5 font-medium text-on-brand disabled:opacity-50 sm:col-span-3 hover:bg-accent-secondary active:scale-[0.99] transition-all cursor-pointer shadow-xs"
              disabled={documentForm.formState.isSubmitting}
            >
              {documentForm.formState.isSubmitting ? t('common.loading') : t('farmer.submit_id')}
            </button>
          </form>
        </SetupCard>
      )}
    </div>
  )
}
