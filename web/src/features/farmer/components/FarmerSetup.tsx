import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { createFarmerPlot, createFarmerProfile, submitIdVerification } from '@/features/farmer/api'

interface Village {
  district: string
  id: string
  name: string
}

const profileSchema = z.object({ name: z.string().trim().min(1).max(120), villageId: z.string().uuid() })
const coordinateSchema = z.string().refine((value) => !Number.isNaN(Number(value)), 'Enter a number')
const plotSchema = z.object({ acres: coordinateSchema.refine((value) => Number(value) > 0 && Number(value) <= 500), lat: coordinateSchema.refine((value) => Number(value) >= -90 && Number(value) <= 90), lng: coordinateSchema.refine((value) => Number(value) >= -180 && Number(value) <= 180), villageId: z.string().uuid() })
const documentSchema = z.object({ consent: z.boolean().refine(Boolean), file: z.instanceof(File), idLast4: z.string().regex(/^\d{4}$/), idType: z.string().trim().min(1).max(40) })

async function getVillages(): Promise<Village[]> {
  const { data, error } = await supabase.from('villages').select('id,name,district').order('name')
  if (error) throw error
  return data
}

function SetupCard({ children, title }: { children: ReactNode; title: string }) {
  return <section className="rounded-2xl border border-surface-border bg-surface p-5"><h3 className="mb-4 text-lg font-medium text-copy-primary">{title}</h3>{children}</section>
}

export function FarmerSetup() {
  const { i18n, t } = useTranslation()
  const villages = useQuery({ queryFn: getVillages, queryKey: ['villages'] })
  const profileForm = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema) })
  const plotForm = useForm<z.infer<typeof plotSchema>>({ defaultValues: { lat: '30.82', lng: '75.171' }, resolver: zodResolver(plotSchema) })
  const documentForm = useForm<z.infer<typeof documentSchema>>({ defaultValues: { consent: false }, resolver: zodResolver(documentSchema) })
  const [message, setMessage] = useState<string | null>(null)

  const villageOptions = villages.data ?? []
  const submitProfile = async (values: z.infer<typeof profileSchema>) => {
    await createFarmerProfile({ ...values, language: i18n.language === 'pa' ? 'pa' : 'en' })
    setMessage(t('farmer.profile_saved'))
  }
  const submitPlot = async (values: z.infer<typeof plotSchema>) => {
    await createFarmerPlot({ ...values, acres: Number(values.acres), lat: Number(values.lat), lng: Number(values.lng) })
    setMessage(t('farmer.plot_saved'))
    plotForm.reset({ lat: values.lat, lng: values.lng, villageId: values.villageId })
  }
  const submitDocument = async (values: z.infer<typeof documentSchema>) => {
    const result = await submitIdVerification(values)
    setMessage(t('farmer.id_status', { status: result.status }))
  }

  if (villages.isLoading) return <p className="text-copy-secondary">{t('common.loading')}</p>
  if (villages.isError) return <p className="text-state-error">{t('farmer.villages_error')}</p>

  return (
    <div className="space-y-4">
      <div><p className="landing-eyebrow">{t('farmer.setup_eyebrow')}</p><h3 className="text-2xl font-display text-copy-primary">{t('farmer.setup_title')}</h3><p className="mt-2 text-copy-secondary">{t('farmer.setup_body')}</p></div>
      {message && <p className="rounded-xl bg-state-success-dim p-3 text-sm text-state-success" role="status">{message}</p>}
      <SetupCard title={t('farmer.profile_title')}>
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={profileForm.handleSubmit(submitProfile)}>
          <label className="text-sm text-copy-primary">{t('farmer.name')}<input className="mt-1 w-full rounded-xl border border-surface-border p-2" {...profileForm.register('name')} /></label>
          <VillageSelect label={t('farmer.village')} options={villageOptions} registration={profileForm.register('villageId')} />
          <button className="self-end rounded-xl bg-brand px-4 py-2 font-medium text-on-brand disabled:opacity-50" disabled={profileForm.formState.isSubmitting}>{t('farmer.save_profile')}</button>
        </form>
      </SetupCard>
      <SetupCard title={t('farmer.plot_title')}>
        <form className="grid gap-3 sm:grid-cols-4" onSubmit={plotForm.handleSubmit(submitPlot)}>
          <VillageSelect label={t('farmer.village')} options={villageOptions} registration={plotForm.register('villageId')} />
          <NumberField label={t('farmer.acres')} registration={plotForm.register('acres')} step="0.1" />
          <NumberField label={t('farmer.latitude')} registration={plotForm.register('lat')} step="0.0001" />
          <NumberField label={t('farmer.longitude')} registration={plotForm.register('lng')} step="0.0001" />
          <button className="rounded-xl bg-brand px-4 py-2 font-medium text-on-brand disabled:opacity-50 sm:col-span-4" disabled={plotForm.formState.isSubmitting}>{t('farmer.add_plot')}</button>
        </form>
      </SetupCard>
      <SetupCard title={t('farmer.id_title')}>
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={documentForm.handleSubmit(submitDocument)}>
          <label className="text-sm text-copy-primary">{t('farmer.id_type')}<input className="mt-1 w-full rounded-xl border border-surface-border p-2" {...documentForm.register('idType')} /></label>
          <label className="text-sm text-copy-primary">{t('farmer.last_four')}<input className="mt-1 w-full rounded-xl border border-surface-border p-2" inputMode="numeric" maxLength={4} {...documentForm.register('idLast4')} /></label>
          <label className="text-sm text-copy-primary">{t('farmer.document')}<input className="mt-1 block w-full text-sm text-copy-secondary" accept="image/jpeg,image/png,application/pdf" type="file" onChange={(event) => documentForm.setValue('file', event.target.files?.[0] as File, { shouldValidate: true })} /></label>
          <label className="flex items-start gap-2 text-sm text-copy-secondary sm:col-span-2"><input className="mt-1" type="checkbox" {...documentForm.register('consent')} />{t('farmer.consent')}</label>
          <button className="rounded-xl bg-brand px-4 py-2 font-medium text-on-brand disabled:opacity-50" disabled={documentForm.formState.isSubmitting}>{t('farmer.submit_id')}</button>
        </form>
      </SetupCard>
    </div>
  )
}

function VillageSelect({ label, options, registration }: { label: string; options: Village[]; registration: UseFormRegisterReturn }) {
  return <label className="text-sm text-copy-primary">{label}<select className="mt-1 w-full rounded-xl border border-surface-border bg-surface p-2" {...registration}><option value="" />{options.map((village) => <option key={village.id} value={village.id}>{village.name}, {village.district}</option>)}</select></label>
}

function NumberField({ label, registration, step }: { label: string; registration: UseFormRegisterReturn; step: string }) {
  return <label className="text-sm text-copy-primary">{label}<input className="mt-1 w-full rounded-xl border border-surface-border p-2" step={step} type="number" {...registration} /></label>
}
