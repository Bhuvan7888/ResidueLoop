import { supabase } from '@/lib/supabase'

export async function createListing(data: Record<string, unknown>) {
  const { data: res, error } = await supabase.functions.invoke('api/v1/listings', {
    body: data
  })
  if (error) throw error
  return res
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
