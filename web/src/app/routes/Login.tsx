import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PhoneOtpForm } from '@/features/auth/components/PhoneOtpForm'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function Login() {
  const { session, loading } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  if (loading) return <div>{t('common.loading')}</div>

  if (session) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <header className="px-6 py-4 flex justify-end">
        <button 
          onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'pa' : 'en')}
          className="text-brand text-sm font-medium cursor-pointer"
        >
          {i18n.language === 'en' ? 'ਪੰਜਾਬੀ' : 'English'}
        </button>
      </header>
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center max-w-5xl mx-auto w-full px-6 py-16 md:py-24 gap-12">
        <div className="flex-1 text-center md:text-left">
          <p className="text-copy-secondary italic font-display mb-2">{t('auth.welcome_prefix')}</p>
          <h1 className="text-5xl md:text-7xl font-display text-copy-primary mb-4">{t('auth.brand')}</h1>
          <p className="text-xl text-copy-secondary">{t('subtitle')}</p>
        </div>
        <div className="w-full max-w-md">
          <div className="bg-surface rounded-2xl p-6 border border-surface-border">
            <PhoneOtpForm onSuccess={() => navigate('/')} />
          </div>
        </div>
      </main>
    </div>
  )
}
