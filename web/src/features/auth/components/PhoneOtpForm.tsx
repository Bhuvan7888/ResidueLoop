import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { signInWithOtp, verifyOtp } from "../api"
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
      setError('Please complete the CAPTCHA')
      return
    }
    try {
      await signInWithOtp(values.phone, captchaToken)
      setPhone(values.phone)
      setStep('otp')
      setCountdown(60)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    }
  }

  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    setError(null)
    try {
      await verifyOtp(phone, values.token)
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP')
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-copy-primary mb-1">{t('auth.phone_label')}</label>
          <div className="flex relative items-center">
            <input
              {...phoneForm.register('phone')}
              placeholder="9999999999"
              className="w-full rounded-xl border border-border-surface-border py-2 px-3 focus:ring-2 focus:ring-accent-primary outline-none"
              disabled={phoneForm.formState.isSubmitting}
            />
          </div>
          {phoneForm.formState.errors.phone && (
            <p className="text-state-error text-sm mt-1">{phoneForm.formState.errors.phone.message}</p>
          )}
        </div>
        <div className="flex justify-center my-4">
          <Turnstile 
            siteKey={import.meta.env.VITE_CAPTCHA_SITE_KEY || '1x00000000000000000000AA'} 
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
      </form>
    )
  }

  return (
    <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-copy-primary mb-1">{t('auth.enter_otp_msg')} {phone}</label>
        <input
          {...otpForm.register('token')}
          placeholder="123456"
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
          <span className="text-copy-muted">Resend in {countdown}s</span>
        ) : (
          <button
            type="button"
            onClick={() => onPhoneSubmit({ phone })}
            className="text-brand hover:underline"
          >
            Resend OTP
          </button>
        )}
      </div>
    </form>
  )
}
