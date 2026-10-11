import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { signInWithOtp, verifyOtp, signInDevUser } from "../api"
import { getCaptchaSiteKey } from '../captcha'
import { phoneSchema, otpSchema } from "../schemas"
import { Turnstile } from '@marsidev/react-turnstile'

interface PhoneOtpFormProps {
  onSuccess: () => void
}

export function PhoneOtpForm({ onSuccess }: PhoneOtpFormProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [captchaToken, setCaptchaToken] = useState<string>('')
  const captchaSiteKey = getCaptchaSiteKey({
    configuredSiteKey: import.meta.env.VITE_CAPTCHA_SITE_KEY,
    isDevelopment: import.meta.env.DEV,
  })

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' }
  })

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: '' }
  })

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const onPhoneSubmit = async (values: z.infer<typeof phoneSchema>) => {
    setError(null)
    if (!captchaToken) {
      setError(t('auth.captcha_required'))
      return
    }
    try {
      const e164Phone = `+91${values.phone}`
      await signInWithOtp(e164Phone, captchaToken)
      setPhone(e164Phone)
      setStep('otp')
      setCountdown(60)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.otp_send_failed'))
    }
  }

  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    setError(null)
    try {
      await verifyOtp(phone, values.token)
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.otp_invalid'))
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-copy-primary mb-1">{t('auth.phone_label')}</label>
          <div className="flex relative items-center">
            <span className="absolute left-3 text-copy-muted">+91</span>
            <input
              {...phoneForm.register('phone')}
              placeholder={t('auth.phone_placeholder')}
              className="w-full rounded-xl border border-border-surface-border py-2 pl-10 pr-2 focus:ring-2 focus:ring-accent-primary outline-none"
              disabled={phoneForm.formState.isSubmitting}
            />
          </div>
          {phoneForm.formState.errors.phone && (
            <p className="text-state-error text-sm mt-1">{phoneForm.formState.errors.phone.message}</p>
          )}
        </div>
        <div className="flex justify-center my-4">
          <Turnstile 
            siteKey={captchaSiteKey}
            onSuccess={(token) => { setCaptchaToken(token); setError(null); }}
          />
        </div>
        {error && <p className="text-state-error text-sm">{error}</p>}
        <button
          type="submit"
          disabled={phoneForm.formState.isSubmitting}
          className="w-full bg-brand text-on-brand rounded-xl py-2 font-medium disabled:opacity-50"
        >
          {phoneForm.formState.isSubmitting ? t('auth.verifying') : t('auth.send_otp')}
        </button>

        {import.meta.env.DEV && (
          <div className="pt-3 border-t border-surface-border space-y-2">
            <p className="text-[11px] font-semibold text-copy-secondary uppercase tracking-wider text-center">
              ⚡ 1-Click Demo Login (Instant Access)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await signInDevUser('farmer')
                    onSuccess()
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Farmer login failed')
                  }
                }}
                className="p-2.5 rounded-xl border border-surface-border bg-surface hover:border-brand/50 hover:bg-bg-subtle text-xs font-semibold text-copy-primary flex flex-col items-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <span className="text-lg">🌾</span>
                <span>Farmer</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await signInDevUser('buyer')
                    onSuccess()
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Buyer login failed')
                  }
                }}
                className="p-2.5 rounded-xl border border-brand/40 bg-brand/5 hover:border-brand hover:bg-brand/10 text-xs font-semibold text-brand flex flex-col items-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <span className="text-lg">🏭</span>
                <span>Buyer</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await signInDevUser('donor')
                    onSuccess()
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Donor login failed')
                  }
                }}
                className="p-2.5 rounded-xl border border-surface-border bg-surface hover:border-brand/50 hover:bg-bg-subtle text-xs font-semibold text-copy-primary flex flex-col items-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <span className="text-lg">🌱</span>
                <span>Donor</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await signInDevUser('ngo')
                    onSuccess()
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'NGO login failed')
                  }
                }}
                className="p-2.5 rounded-xl border border-surface-border bg-surface hover:border-brand/50 hover:bg-bg-subtle text-xs font-semibold text-copy-primary flex flex-col items-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <span className="text-lg">🏛️</span>
                <span>NGO</span>
              </button>
            </div>
          </div>
        )}
      </form>
    )
  }

  return (
    <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">{t('auth.enter_otp_msg')} {phone}</label>
        <input
          {...otpForm.register('token')}
          placeholder={t('auth.otp_placeholder')}
          className="w-full rounded-xl border border-border-surface-border p-2 focus:ring-2 focus:ring-accent-primary outline-none"
          disabled={otpForm.formState.isSubmitting}
        />
        {otpForm.formState.errors.token && (
          <p className="text-state-error text-sm mt-1">{otpForm.formState.errors.token.message}</p>
        )}
      </div>
      {error && <p className="text-state-error text-sm">{error}</p>}
      <button
        type="submit"
        disabled={otpForm.formState.isSubmitting}
        className="w-full bg-brand text-on-brand rounded-xl py-2 font-medium disabled:opacity-50"
      >
        {otpForm.formState.isSubmitting ? t('auth.verifying') : t('auth.verify_otp')}
      </button>
      <div className="text-center text-sm">
        {countdown > 0 ? (
          <span className="text-copy-muted">{t('auth.resend_in', { seconds: countdown })}</span>
        ) : (
          <button
            type="button"
            onClick={() => onPhoneSubmit({ phone: phoneForm.getValues('phone') })}
            className="text-brand hover:underline"
          >
            {t('auth.resend_otp')}
          </button>
        )}
      </div>
    </form>
  )
}
