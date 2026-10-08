import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTranslation } from 'react-i18next'

export function Dashboard() {
  const { role, session } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display text-copy-primary">
        {t('dashboard.welcome_msg', { role, id: session?.user.id })}
      </h2>
      <div className="bg-surface border border-surface-border rounded-2xl p-6">
        <p className="text-copy-secondary">This is a placeholder for the {role} features.</p>
        <p className="text-sm text-copy-muted mt-2">ID: {session?.user.id}</p>
      </div>
    </div>
  )
}
