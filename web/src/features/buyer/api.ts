import { supabase } from '@/lib/supabase'
import { apiRequest } from '@/lib/api-client'

interface BuyerProfilePayload {
  orgName: string
  type: 'biomass' | 'cbg' | 'kiln' | 'mill'
  lat: number
  lng: number
  capacity: number
  pricePerTonne: number
  minLoadTonnes: number
}

interface DemandPostPayload {
  tonnesNeeded: number
  pricePerTonne: number
  lat: number
  lng: number
  dateFrom: string
  dateTo: string
}

export async function createBuyerProfile(data: BuyerProfilePayload) {
  return apiRequest('/buyers/profile', {
    body: {
      org_name: data.orgName,
      type: data.type,
      lat: data.lat,
      lng: data.lng,
      capacity: data.capacity,
      price_per_tonne: data.pricePerTonne,
      min_load_tonnes: data.minLoadTonnes,
    },
    method: 'POST',
  })
}

export async function createDemandPost(data: DemandPostPayload) {
  return apiRequest('/buyers/demand', {
    body: {
      tonnes_needed: data.tonnesNeeded,
      price_per_tonne: data.pricePerTonne,
      lat: data.lat,
      lng: data.lng,
      date_from: data.dateFrom,
      date_to: data.dateTo,
    },
    method: 'POST',
  })
}

export async function updateDemandPost(postId: string, data: Record<string, unknown>) {
  return apiRequest(`/buyers/demand/${postId}`, { body: data, method: 'PATCH' })
}

export async function getDemandPosts() {
  const { data, error } = await supabase.from('demand_posts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}
