import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { BuyerDashboard } from '@/features/buyer/components/BuyerDashboard'
import { FarmerDashboard } from '@/features/farmer/components/FarmerDashboard'

export function Dashboard() {
  const { role, session } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display text-copy-primary">
        {t('dashboard.welcome_msg', { role, id: session?.user.id })}
      </h2>
      
      {role === 'buyer' && <BuyerDashboard />}
      {role === 'farmer' && <FarmerDashboard userId={session?.user.id || ''} />}
    </div>
  )
}
