import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { BuyerDashboard } from '@/features/buyer/components/BuyerDashboard'
import { FarmerDashboard } from '@/features/farmer/components/FarmerDashboard'
import { FarmerSetup } from '@/features/farmer/components/FarmerSetup'
import { DonorDashboard } from '@/features/charity/components/DonorDashboard'
import { NgoDashboard } from '@/features/charity/components/NgoDashboard'

export function Dashboard() {
  const { role, session } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="dashboard-page space-y-8">
      <div className="dashboard-page__heading">
        <p className="landing-eyebrow">{t('dashboard.eyebrow')}</p>
        <h2>{t('dashboard.welcome_msg', { role: t(`auth.role_${role}`) })}</h2>
        <p>{t('dashboard.description')}</p>
      </div>
      
      {role === 'buyer' && <BuyerDashboard />}
      {role === 'farmer' && (
        <>
          <FarmerSetup />
          <FarmerDashboard userId={session?.user.id || ''} />
        </>
      )}
      {role === 'donor' && <DonorDashboard userId={session?.user.id || ''} />}
      {role === 'ngo' && <NgoDashboard userId={session?.user.id || ''} />}
    </div>
  )
}
