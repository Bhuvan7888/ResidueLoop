import { supabase } from '@/lib/supabase'
import { apiRequest } from '@/lib/api-client'
import { getCoordinatesFromLocation } from './distance'

export interface BuyerProfilePayload {
  orgName: string
  type: 'biomass' | 'cbg' | 'kiln' | 'mill'
  lat: number
  lng: number
  capacity: number
  pricePerTonne: number
  minLoadTonnes: number
}

export interface DemandPostPayload {
  tonnesNeeded: number
  pricePerTonne: number
  lat: number
  lng: number
  dateFrom: string
  dateTo: string
  targetPurpose?: string
  requiredForm?: string
}

export interface DemandPostItem {
  id: string
  buyer_id?: string
  tonnes_needed: number
  price_per_tonne: number
  date_from: string
  date_to: string
  status?: string
  created_at?: string
  location?: unknown
  lat: number
  lng: number
  target_purpose?: string
  required_form?: string
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
      target_purpose: data.targetPurpose,
      required_form: data.requiredForm,
    },
    method: 'POST',
  })
}

export async function updateDemandPost(postId: string, data: Record<string, unknown>) {
  return apiRequest(`/buyers/demand/${postId}`, { body: data, method: 'PATCH' })
}

export async function getDemandPosts(): Promise<DemandPostItem[]> {
  try {
    const res = await apiRequest<DemandPostItem[]>('/buyers/demand')
    if (res && Array.isArray(res)) {
      return res.map((item) => {
        const coords = getCoordinatesFromLocation(item.location, {
          lat: item.lat || 30.82,
          lng: item.lng || 75.17,
        })
        return {
          ...item,
          lat: coords.lat,
          lng: coords.lng,
        }
      })
    }
  } catch (err) {
    console.warn('API getDemandPosts fallback to Supabase:', err)
  }

  const { data, error } = await supabase.from('demand_posts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((item) => {
    const coords = getCoordinatesFromLocation(item.location, { lat: 30.82, lng: 75.17 })
    return {
      ...item,
      lat: coords.lat,
      lng: coords.lng,
    }
  })
}

export async function procureListing(listingId: string, offerPrice: number = 1500) {
  return apiRequest(`/buyers/procure/${listingId}`, {
    body: { offer_price: offerPrice },
    method: 'POST',
  })
}
