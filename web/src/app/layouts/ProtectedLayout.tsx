import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { LanguageSwitch } from '@/components/common/LanguageSwitch'

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
    // If signed in but no role, they should be picking a role, but we'll handle this in a wrapper or here.
    // Actually, role picker could be a route or handled within the layout.
    // Let's redirect to a role picker route or show it here.
    return <Navigate to="/role-picker" replace />
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <header className="app-nav">
        <Link to="/app" className="font-display text-2xl tracking-tight">{t('auth.brand')}</Link>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-subtle px-3 py-2 text-sm text-copy-secondary sm:block">{t(`auth.role_${role}`)}</span>
          <LanguageSwitch compact />
          <button type="button" onClick={signOut} className="app-nav__signout">{t('common.sign_out')}</button>
        </div>
      </header>
      <main className="flex-1 p-6 pb-12 pt-10 md:p-10 md:pb-16 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
