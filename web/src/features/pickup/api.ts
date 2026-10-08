import { supabase } from '@/lib/supabase'

export async function updatePickupWeight(pickupId: string, data: { actual_tonnes: number }) {
  const { data: res, error } = await supabase.functions.invoke(`api/v1/pickups/${pickupId}/weight`, {
    body: data,
    method: 'PATCH'
  })
  if (error) throw error
  return res
}

export async function updatePickupPayment(pickupId: string, data: { payment_status: 'pending' | 'received' | 'not_received' }) {
  const { data: res, error } = await supabase.functions.invoke(`api/v1/pickups/${pickupId}/payment_status`, {
    body: data,
    method: 'PATCH'
  })
  if (error) throw error
  return res
}

export async function getPickups() {
  const { data, error } = await supabase
    .from('pickups')
    .select('*, pools(*)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}
