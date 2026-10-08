import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function ProtectedLayout() {
  const { session, role, loading } = useAuth()
  const { t } = useTranslation()

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
      <header className="border-b border-surface-border-subtle bg-surface px-6 py-4 flex justify-between items-center">
        <h1 className="font-display text-xl text-copy-primary">{t('auth.brand')}</h1>
        {/* Navbar shell items here */}
      </header>
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
