import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { LanguageSwitch } from '@/components/common/LanguageSwitch'
import { UserProfileDropdown } from '@/components/common/UserProfileDropdown'

export function ProtectedLayout() {
  const { session, role, loading } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-base">{t('common.loading')}</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!role) {
    return <Navigate to="/role-picker" replace />
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <header className="app-nav">
        <Link to="/app" className="font-display text-2xl tracking-tight">{t('auth.brand')}</Link>
        <div className="flex items-center gap-3">
          <LanguageSwitch compact />
          <UserProfileDropdown onSignOut={signOut} />
        </div>
      </header>
      <main className="flex-1 p-6 pb-12 pt-10 md:p-10 md:pb-16 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
