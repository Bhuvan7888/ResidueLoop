import { supabase } from '@/lib/supabase'
import { apiRequest } from '@/lib/api-client'

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
  const { data, error } = await supabase
    .from('pools')
    .select('*, listings(*, plots(*)), villages(name, district)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}
