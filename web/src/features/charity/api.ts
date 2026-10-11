import { supabase } from '@/lib/supabase'
import { apiRequest } from '@/lib/api-client'

interface RankedVillage {
  influence_score: number
  label: string
  village?: { name: string }
}

export async function getRankedVillages(city: string = "Delhi") {
  return apiRequest<RankedVillage[]>(`/charity/villages/ranked?city=${encodeURIComponent(city)}`)
}

export async function createDonation(data: {
  ngo_id?: string
  amount: number
  target_village_id?: string
  campaign_id?: string
}) {
  return apiRequest('/charity/donate', { body: data, method: 'POST' })
}

export async function requestAssistance(data: {
  ngo_id?: string
  listing_id: string
  amount_requested?: number
  purpose?: string
}) {
  return apiRequest('/charity/requests', { body: data, method: 'POST' })
}

export async function updateRequestStatus(requestId: string, status: 'approved' | 'declined') {
  return apiRequest(`/charity/requests/${requestId}/status`, { body: { status }, method: 'PATCH' })
}

export async function recordDisbursement(
  requestId: string,
  payeeName: string,
  amount: number,
  payeeType: 'baler' | 'transport provider' | 'farmer' = 'baler',
  note?: string
) {
  return apiRequest(`/charity/requests/${requestId}/disbursements`, {
    body: { payee_name: payeeName, amount, payee_type: payeeType, note },
    method: 'POST',
  })
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

export async function getNgoDisbursements(ngoId: string) {
  const { data, error } = await supabase
    .from('disbursements')
    .select('*, assistance_requests(purpose, farmers(profiles(name)))')
    .eq('ngo_id', ngoId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getNgoDonations(ngoId: string) {
  const { data, error } = await supabase
    .from('donations')
    .select('*, donor:profiles(name), villages(name)')
    .eq('ngo_id', ngoId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
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

export async function getCrowdfundingCampaigns() {
  try {
    const res = await apiRequest<{ data: Record<string, unknown>[] }>('/charity/campaigns')
    return res.data || []
  } catch (err) {
    console.error('Error fetching crowdfunding campaigns:', err)
    const { data } = await supabase
      .from('assistance_requests')
      .select('*, farmers(profiles(name)), listings(*, plots(*)), ngos(profiles(name))')
      .order('created_at', { ascending: false })
    return data || []
  }
}
