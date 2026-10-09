import { apiRequest } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export function createListing(data: Record<string, unknown>) {
  return apiRequest('/listings', { body: data })
}

export async function getListings() {
  const { data, error } = await supabase.from('listings').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getPlots(farmerId: string) {
  // Provided for UI since Unit 03 is missing plots logic in UI
  const { data, error } = await supabase.from('plots').select('*').eq('farmer_id', farmerId)
  if (error) throw error
  return data
}
