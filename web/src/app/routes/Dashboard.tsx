import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { BuyerDashboard } from '@/features/buyer/components/BuyerDashboard'
import { FarmerDashboard } from '@/features/farmer/components/FarmerDashboard'
import { DonorDashboard } from '@/features/charity/components/DonorDashboard'
import { NgoDashboard } from '@/features/charity/components/NgoDashboard'

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
      {role === 'donor' && <DonorDashboard userId={session?.user.id || ''} />}
      {role === 'ngo' && <NgoDashboard userId={session?.user.id || ''} />}
    </div>
  )
}
