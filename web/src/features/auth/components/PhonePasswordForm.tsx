import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { signInWithPhonePassword, signUpWithPhonePassword } from '../api'
import { phonePasswordSchema } from '../schemas'

interface PhonePasswordFormProps {
  onSuccess: () => void
}

type AuthMode = 'sign-in' | 'sign-up'

export function PhonePasswordForm({ onSuccess }: PhonePasswordFormProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof phonePasswordSchema>>({
    resolver: zodResolver(phonePasswordSchema),
    defaultValues: { phone: '', password: '' },
  })

  const submit = async (values: z.infer<typeof phonePasswordSchema>) => {
    setError(null)
    const phone = `+91${values.phone}`

    try {
      const result = mode === 'sign-in'
        ? await signInWithPhonePassword(phone, values.password)
        : await signUpWithPhonePassword(phone, values.password)

      if (!result.session) {
        setError(t('auth.phone_confirmation_required'))
        return
      }

      onSuccess()
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error
        ? submissionError.message
        : t(mode === 'sign-in' ? 'auth.sign_in_failed' : 'auth.sign_up_failed'))
    }
  }

  const switchMode = () => {
    setMode((currentMode) => currentMode === 'sign-in' ? 'sign-up' : 'sign-in')
    setError(null)
  }

  const isSignIn = mode === 'sign-in'

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <p className="text-sm text-copy-secondary">{t('auth.phone_password_note')}</p>
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-copy-primary">
          {t('auth.phone_label')}
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-copy-muted">+91</span>
          <input
            {...form.register('phone')}
            id="phone"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={t('auth.phone_placeholder')}
            className="w-full rounded-xl border border-border-surface-border py-2 pl-10 pr-2 outline-none focus:ring-2 focus:ring-accent-primary"
            disabled={form.formState.isSubmitting}
          />
        </div>
        {form.formState.errors.phone && <p className="mt-1 text-sm text-state-error">{form.formState.errors.phone.message}</p>}
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-copy-primary">
          {t('auth.password_label')}
        </label>
        <input
          {...form.register('password')}
          id="password"
          type="password"
          autoComplete={isSignIn ? 'current-password' : 'new-password'}
          placeholder={t('auth.password_placeholder')}
          className="w-full rounded-xl border border-border-surface-border p-2 outline-none focus:ring-2 focus:ring-accent-primary"
          disabled={form.formState.isSubmitting}
        />
        {form.formState.errors.password && <p className="mt-1 text-sm text-state-error">{form.formState.errors.password.message}</p>}
      </div>
      {error && <p className="text-sm text-state-error">{error}</p>}
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full rounded-xl bg-brand py-2 font-medium text-on-brand disabled:opacity-50"
      >
        {form.formState.isSubmitting
          ? t(isSignIn ? 'auth.signing_in' : 'auth.creating_account')
          : t(isSignIn ? 'auth.sign_in_password' : 'auth.create_account')}
      </button>
      <p className="text-center text-sm text-copy-secondary">
        {t(isSignIn ? 'auth.new_user' : 'auth.existing_user')}{' '}
        <button type="button" onClick={switchMode} className="text-brand hover:underline">
          {t(isSignIn ? 'auth.create_account' : 'auth.sign_in_password')}
        </button>
      </p>
    </form>
  )
}
