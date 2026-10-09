import { useQuery } from '@tanstack/react-query'
import { MapPinned } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/common/EmptyState'
import { getVillageHeatmap, type VillageHeat } from '../api'
import { HeatmapCanvas } from './HeatmapCanvas'

export function DemandHeatmap() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useQuery({ queryKey: ['heatmap'], queryFn: getVillageHeatmap })
  const villages = data ?? []
  const zones = villages.filter((v) => v.is_unfilled_zone).sort((a, b) => b.unfilled_tonnes - a.unfilled_tonnes)
  const label = (v: VillageHeat) =>
    t('heatmap.unfilled_label', '{{name}}: {{tonnes}} t unfilled', { name: v.name, tonnes: v.unfilled_tonnes })

  return (
    <div className="relative h-[calc(100vh-10rem)] min-h-96 rounded-2xl overflow-hidden border border-surface-border">
      <HeatmapCanvas villages={villages} unfilledLabel={label} />
      <aside className="absolute left-4 top-4 w-72 max-h-[85%] overflow-y-auto bg-surface border border-surface-border rounded-2xl p-4 space-y-4">
        <div>
          <h2 className="font-display text-xl text-copy-primary">{t('heatmap.title', 'Demand map')}</h2>
          <p className="text-sm text-copy-secondary">
            {t('heatmap.subtitle', 'Village level. Posted demand against current supply.')}
          </p>
        </div>
        <ul className="space-y-1 text-sm text-copy-secondary">
          <li>{t('heatmap.legend_demand', 'Filled circle: posted demand')}</li>
          <li>{t('heatmap.legend_supply', 'Ring: supply from open listings and pools')}</li>
          <li>{t('heatmap.legend_unfilled', 'Outlined and labelled: unfilled demand zone')}</li>
        </ul>
        {isLoading && <p className="text-sm text-copy-muted">{t('common.loading', 'Loading...')}</p>}
        {isError && <p className="text-sm text-state-error">{t('heatmap.error', 'Could not load the map data.')}</p>}
        {!isLoading && !isError && zones.length === 0 && (
          <EmptyState icon={<MapPinned />} message={t('heatmap.no_zones', 'No unfilled demand right now.')} className="p-2" />
        )}
        <ul className="space-y-2">
          {zones.map((v) => (
            <li key={v.village_id} className="border border-state-warning rounded-xl px-3 py-2 text-sm text-copy-primary">
              {label(v)}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
