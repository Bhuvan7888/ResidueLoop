import { useTranslation } from 'react-i18next'

interface Pool {
  id: string
  status: string
  target_tonnes: number
  current_tonnes: number
  pickup_date: string | null
}

export function PoolProgress({ pool }: { pool?: Pool }) {
  const { t } = useTranslation()

  if (!pool) {
    return (
      <div className="bg-surface border border-surface-border rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-bg-subtle rounded w-1/3 mb-4"></div>
        <div className="w-full bg-bg-subtle rounded-full h-2.5 mb-2"></div>
        <div className="flex justify-between">
          <div className="h-3 bg-bg-subtle rounded w-1/4"></div>
          <div className="h-3 bg-bg-subtle rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  const percentage = Math.min((pool.current_tonnes / pool.target_tonnes) * 100, 100)
  
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium text-copy-primary">{t('matching.pool_progress', 'Pool Progress')}</h4>
        <span className="text-xs px-2 py-1 bg-bg-subtle rounded-md text-copy-secondary uppercase tracking-wider">
          {t(`status.${pool.status}`, pool.status)}
        </span>
      </div>
      
      <div className="w-full bg-bg-subtle rounded-full h-2.5 mb-2">
        <div 
          className="bg-brand h-2.5 rounded-full" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-xs text-copy-secondary">
        <span>{pool.current_tonnes.toFixed(1)}t {t('matching.collected', 'collected')}</span>
        <span>{pool.target_tonnes.toFixed(1)}t {t('matching.goal', 'goal')}</span>
      </div>
      
      {pool.pickup_date && (
        <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
          <span className="text-sm text-copy-primary font-medium">{t('matching.scheduled_pickup', 'Scheduled Pickup')}:</span>
          <span className="text-sm text-copy-secondary">{pool.pickup_date}</span>
        </div>
      )}
    </div>
  )
}
