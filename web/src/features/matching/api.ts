import { supabase } from '@/lib/supabase'

export async function getOffers() {
  const { data, error } = await supabase
    .from('offers')
    .select('*, listings(*, plots(*))')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function handleOfferAction(offerId: string, action: 'accept' | 'decline') {
  const { data, error } = await supabase.functions.invoke(`api/v1/offers/${offerId}/action`, {
    body: { action }
  })
  if (error) throw error
  return data
}

export async function getPools() {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}
