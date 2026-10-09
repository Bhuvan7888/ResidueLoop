import { apiRequest } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export async function getOffers() {
  const { data, error } = await supabase
    .from('offers')
    .select('*, listings(*, plots(*))')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export function handleOfferAction(offerId: string, action: 'accept' | 'decline') {
  return apiRequest(`/offers/${offerId}/action`, { body: { action } })
}

export async function getPools() {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
