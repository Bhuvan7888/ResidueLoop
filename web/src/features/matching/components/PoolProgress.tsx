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
  const remaining = Math.max(0, pool.target_tonnes - pool.current_tonnes)
  const farmersNeeded = Math.ceil(remaining / 2.5) // Average 2.5t per farmer
  const isReady = pool.status === 'ready' || pool.current_tonnes >= pool.target_tonnes

  return (
    <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-bold text-copy-primary">{t('matching.pool_progress', 'Village Straw Pool Progress')}</h4>
          <p className="text-xs text-copy-secondary mt-0.5">
            {pool.current_tonnes.toFixed(1)} of {pool.target_tonnes.toFixed(1)} tonnes
            {!isReady && farmersNeeded > 0 && (
              <span className="text-brand font-medium"> • ~{farmersNeeded} more farmer(s) needed</span>
            )}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
          isReady ? 'bg-state-success-dim text-state-success' : 'bg-brand/15 text-brand'
        }`}>
          {t(`status.${pool.status}`, pool.status)}
        </span>
      </div>
      
      <div className="w-full bg-bg-subtle rounded-full h-3 overflow-hidden">
        <div 
          className="bg-brand h-3 rounded-full transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-xs text-copy-secondary">
        <span>{pool.current_tonnes.toFixed(1)}t {t('matching.collected', 'collected')}</span>
        <span>{pool.target_tonnes.toFixed(1)}t {t('matching.goal', 'target load')} ({percentage.toFixed(0)}%)</span>
      </div>
      
      {pool.pickup_date && (
        <div className="pt-3 border-t border-surface-border flex items-center justify-between">
          <span className="text-xs text-copy-secondary">{t('matching.scheduled_pickup', 'Scheduled Pickup')}:</span>
          <span className="text-xs font-bold text-state-success bg-state-success-dim px-2.5 py-1 rounded-lg">
            🗓️ {pool.pickup_date}
          </span>
        </div>
      )}
    </div>
  )
}
