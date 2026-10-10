import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PhoneOtpForm } from '@/features/auth/components/PhoneOtpForm'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { FieldIllustration } from '@/components/common/FieldIllustration'
import { LanguageSwitch } from '@/components/common/LanguageSwitch'

export function Login() {
  const { session, loading } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (loading) return <div>{t('common.loading')}</div>

  if (session) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="auth-page min-h-screen bg-base">
      <header className="landing-nav">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-copy-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('auth.back_home')}
        </Link>
        <LanguageSwitch compact />
      </header>
      <main className="auth-page__main">
        <div className="auth-page__intro landing-reveal">
          <p className="landing-eyebrow">{t('auth.welcome_prefix')}</p>
          <h1>{t('auth.login_title')}</h1>
          <p>{t('auth.login_body')}</p>
          <FieldIllustration className="auth-page__art" />
        </div>
        <div className="auth-page__card landing-reveal">
          <div>
            <p className="landing-eyebrow">{t('auth.sign_in_eyebrow')}</p>
            <h2>{t('auth.brand')}</h2>
          </div>
          <PhoneOtpForm onSuccess={() => navigate('/app')} />
        </div>
      </main>
    </div>
  )
}
