import { apiRequest } from '@/lib/api'

export interface VillageHeat {
  village_id: string
  name: string
  lat: number
  lng: number
  demand_tonnes: number
  supply_tonnes: number
  unfilled_tonnes: number
  is_unfilled_zone: boolean
}

export function getVillageHeatmap() {
  return apiRequest<VillageHeat[]>('/heatmap/villages', { method: 'GET' })
}
