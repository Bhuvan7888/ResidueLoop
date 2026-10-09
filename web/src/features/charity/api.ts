import { supabase } from '@/lib/supabase'

export async function getRankedVillages(city: string = "Delhi") {
  const { data: res, error } = await supabase.functions.invoke(`api/v1/charity/villages/ranked?city=${city}`, {
    method: 'GET'
  })
  if (error) throw error
  return res
}

export async function createDonation(data: { ngo_id: string; amount: number; target_village_id?: string }) {
  const { data: res, error } = await supabase.functions.invoke('api/v1/charity/donate', {
    method: 'POST',
    body: data
  })
  if (error) throw error
  return res
}

export async function requestAssistance(data: { ngo_id: string; listing_id: string; amount_requested: number; purpose: string }) {
  const { data: res, error } = await supabase.functions.invoke('api/v1/charity/requests', {
    method: 'POST',
    body: data
  })
  if (error) throw error
  return res
}

export async function updateRequestStatus(requestId: string, status: 'approved' | 'declined') {
  const { data: res, error } = await supabase.functions.invoke(`api/v1/charity/requests/${requestId}/status`, {
    method: 'PATCH',
    body: { status }
  })
  if (error) throw error
  return res
}

export async function recordDisbursement(requestId: string, payeeName: string, amount: number) {
  const { data: res, error } = await supabase.functions.invoke(`api/v1/charity/requests/${requestId}/disbursements`, {
    method: 'POST',
    body: { payee_name: payeeName, amount }
  })
  if (error) throw error
  return res
}

// Data fetching wrappers for UI
export async function getNGOs() {
  const { data, error } = await supabase.from('ngos').select('*, profiles(name)')
  if (error) throw error
  return data
}

export async function getDonorHistory(donorId: string) {
  const { data, error } = await supabase.from('donations').select('*, ngos(profiles(name)), villages(name)').eq('donor_id', donorId)
  if (error) throw error
  return data
}

export async function getNgoRequests(ngoId: string) {
  const { data, error } = await supabase.from('assistance_requests').select('*, farmers(profiles(name)), listings(acres, price_per_tonne)').eq('ngo_id', ngoId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getNgoLedger(ngoId: string) {
  const donations = await supabase.from('donations').select('amount').eq('ngo_id', ngoId)
  const disbursements = await supabase.from('disbursements').select('amount').eq('ngo_id', ngoId)
  
  const totalReceived = (donations.data || []).reduce((acc, d) => acc + d.amount, 0)
  const totalDisbursed = (disbursements.data || []).reduce((acc, d) => acc + d.amount, 0)
  
  return {
    totalReceived,
    totalDisbursed,
    balance: totalReceived - totalDisbursed
  }
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase.from('notifications').select('*').eq('profile_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}
