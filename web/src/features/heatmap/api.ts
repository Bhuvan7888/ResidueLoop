import { apiRequest } from '@/lib/api-client'

export interface VillageHeat {
  village_id: string
  name: string
  district?: string
  lat: number
  lng: number
  demand_tonnes: number
  supply_tonnes: number
  unfilled_tonnes: number
  surplus_tonnes?: number
  is_unfilled_zone: boolean
  is_surplus_zone?: boolean
  listings_count?: number
  avg_price?: number
  status?: 'deficit' | 'surplus' | 'balanced' | string
}

export function getVillageHeatmap() {
  return apiRequest<VillageHeat[]>('/heatmap/villages', { method: 'GET' })
}

