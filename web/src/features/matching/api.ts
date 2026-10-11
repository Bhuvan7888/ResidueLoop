import { supabase } from '@/lib/supabase'
import { apiRequest } from '@/lib/api-client'

export interface DealCounterparty {
  id: string
  name?: string
  org_name?: string
  contact_name?: string
  phone?: string
  village_name?: string
  district?: string
  acres?: number
  stubble_form?: string
  type?: string
  harvest_date?: string
  combine_sms_used?: boolean
}

export interface MatchedDeal {
  id: string
  offer_id: string
  listing_id?: string
  status: string
  price_per_tonne: number
  est_tonnes: number
  total_amount: number
  pickup_start?: string | null
  pickup_end?: string | null
  created_at?: string
  last_message?: string | null
  last_message_at?: string | null
  farmer: DealCounterparty
  buyer: DealCounterparty
  baler: {
    id?: string
    name?: string
    phone?: string
  }
}

export interface DealMessage {
  id: string
  offer_id: string
  sender_id?: string
  sender_role: 'farmer' | 'buyer' | 'system'
  sender_name: string
  text: string
  created_at: string
}

export async function getOffers() {
  const { data, error } = await supabase
    .from('offers')
    .select('*, listings(*, plots(*)), buyers(org_name), balers(name)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function handleOfferAction(offerId: string, action: 'accept' | 'decline') {
  return apiRequest(`/offers/${offerId}/action`, { body: { action }, method: 'POST' })
}

export async function getPools() {
  try {
    const res = await apiRequest<{ data: Record<string, unknown>[] } | Record<string, unknown>[]>('/pools')
    if (res && 'data' in res && Array.isArray(res.data)) return res.data
    if (Array.isArray(res)) return res
  } catch (err) {
    console.warn('API getPools fallback to Supabase:', err)
  }
  const { data, error } = await supabase
    .from('pools')
    .select('*, listings(*, plots(*)), villages(name, district)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getMatchedDeals(params?: { userId?: string; role?: string; status?: string }) {
  const query = new URLSearchParams()
  if (params?.userId) query.set('user_id', params.userId)
  if (params?.role) query.set('role', params.role)
  if (params?.status) query.set('status', params.status)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return apiRequest<MatchedDeal[]>(`/offers/deals${qs}`)
}

export async function getSingleDeal(offerId: string) {
  return apiRequest<MatchedDeal>(`/offers/${offerId}/deal`)
}

export async function getDealMessages(offerId: string) {
  return apiRequest<DealMessage[]>(`/offers/${offerId}/messages`)
}

export async function sendDealMessage(offerId: string, payload: {
  message: string
  sender_id?: string
  sender_role: 'farmer' | 'buyer'
  sender_name?: string
}) {
  return apiRequest<DealMessage>(`/offers/${offerId}/messages`, {
    method: 'POST',
    body: payload,
  })
}
