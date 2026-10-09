import { apiRequest } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export function updatePickupWeight(pickupId: string, data: { weighed_tonnes: number }) {
  return apiRequest(`/pickups/${pickupId}/weight`, { method: 'PATCH', body: data })
}

export function completePickup(pickupId: string) {
  return apiRequest(`/pickups/${pickupId}/complete`)
}

export function updatePickupPayment(pickupId: string, data: { payment_status: 'pending' | 'received' | 'not_received' }) {
  return apiRequest(`/pickups/${pickupId}/payment_status`, { method: 'PATCH', body: data })
}

export async function getPickups() {
  const { data, error } = await supabase
    .from('pickups')
    .select('*, pools(*), listings(source)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
