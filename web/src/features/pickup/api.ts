import { supabase } from '@/lib/supabase'
import { apiRequest } from '@/lib/api-client'

export async function updatePickupWeight(pickupId: string, data: { actual_tonnes: number; quality_notes?: string }) {
  return apiRequest(`/pickups/${pickupId}/weight`, { body: data, method: 'PATCH' })
}

export async function updatePickupPayment(pickupId: string, data: { payment_status: 'pending' | 'received' | 'not_received' }) {
  return apiRequest(`/pickups/${pickupId}/payment_status`, { body: data, method: 'PATCH' })
}

export async function getPickups() {
  const { data, error } = await supabase
    .from('pickups')
    .select('*, pools(*)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}
