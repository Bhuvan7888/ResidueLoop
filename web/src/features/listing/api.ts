import { supabase } from '@/lib/supabase'
import { apiRequest } from '@/lib/api-client'

interface ListingPayload {
  plotId: string
  harvestDate: string
  combineSmsUsed: boolean
  estTonnes: number
}

export async function createListing(data: ListingPayload) {
  return apiRequest('/listings', {
    body: {
      plot_id: data.plotId,
      harvest_date: data.harvestDate,
      combine_sms_used: data.combineSmsUsed,
      est_tonnes: data.estTonnes,
    },
    method: 'POST',
  })
}

export async function getListings(farmerId?: string) {
  try {
    const url = farmerId ? `/listings?farmer_id=${encodeURIComponent(farmerId)}` : '/listings'
    const res = await apiRequest<Record<string, unknown>[]>(url)
    if (res) return res
  } catch (err) {
    console.warn('API getListings fallback to Supabase:', err)
  }
  let query = supabase.from('listings').select('*, plots(*, villages(*))').order('created_at', { ascending: false })
  if (farmerId) {
    query = query.eq('farmer_id', farmerId)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getPlots(farmerId: string) {
  // Provided for UI since Unit 03 is missing plots logic in UI
  const { data, error } = await supabase.from('plots').select('*, verifications(*)').eq('farmer_id', farmerId)
  if (error) throw error
  return data
}
