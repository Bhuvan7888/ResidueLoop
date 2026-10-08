interface Pool {
  id: string
  status: string
  target_tonnes: number
  current_tonnes: number
  pickup_date: string | null
}

export function PoolProgress({ pool }: { pool: Pool }) {
  const percentage = Math.min((pool.current_tonnes / pool.target_tonnes) * 100, 100)
  
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium text-copy-primary">Pool Progress</h4>
        <span className="text-xs px-2 py-1 bg-bg-subtle rounded-md text-copy-secondary uppercase tracking-wider">
          {pool.status}
        </span>
      </div>
      
      <div className="w-full bg-bg-subtle rounded-full h-2.5 mb-2">
        <div 
          className="bg-brand h-2.5 rounded-full" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-xs text-copy-secondary">
        <span>{pool.current_tonnes.toFixed(1)}t collected</span>
        <span>{pool.target_tonnes.toFixed(1)}t goal</span>
      </div>
      
      {pool.pickup_date && (
        <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
          <span className="text-sm text-copy-primary font-medium">Scheduled Pickup:</span>
          <span className="text-sm text-copy-secondary">{pool.pickup_date}</span>
        </div>
      )}
    </div>
  )
}
