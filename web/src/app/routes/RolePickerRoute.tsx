import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RolePicker } from '@/features/auth/components/RolePicker'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function RolePickerRoute() {
  const { session, role, loading } = useAuth()
  const { t } = useTranslation()

  if (loading) return <div>{t('common.loading')}</div>
  if (!session) return <Navigate to="/login" replace />
  if (role) return <Navigate to="/app" replace />

  return (
    <div className="auth-page min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md auth-page__card">
        <RolePicker 
          onRoleSelected={() => {
            window.location.href = '/app'
          }} 
        />
      </div>
    </div>
  )
}
