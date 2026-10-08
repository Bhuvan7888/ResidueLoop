import { supabase } from '@/lib/supabase'

export async function updatePickup(pickupId: string, data: { actual_tonnes: number, payment_status: string }) {
  const { data: res, error } = await supabase.functions.invoke(`api/v1/pickups/${pickupId}`, {
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
