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
  const { data, error } = await supabase
    .from('assistance_requests')
    .select('*, farmers(profiles(name, phone)), listings(id, est_tonnes, status, plots(acres, villages(name)))')
    .eq('ngo_id', ngoId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getNgoDisbursements(ngoId: string) {
  const { data, error } = await supabase
    .from('disbursements')
    .select('*, assistance_requests(purpose, farmers(profiles(name)))')
    .eq('ngo_id', ngoId)
    .order('disbursed_at', { ascending: false })
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

export async function createStripeCheckoutSession(data: {
  campaign_id: string
  amount: number
  currency?: string
  return_url?: string
}) {
  return apiRequest<{
    session_id: string
    checkout_url: string
    publishable_key: string
  }>('/charity/stripe/create-checkout-session', {
    body: data,
    method: 'POST',
  })
}

export async function confirmStripePayment(data: {
  campaign_id: string
  amount: number
  session_id?: string
  donor_id?: string
  is_test_dummy?: boolean
}) {
  return apiRequest<{
    status: string
    donation: Record<string, unknown>
    amount_donated: number
    total_funded: number
    amount_requested: number
    percent_funded: number
    is_fully_funded: boolean
    ngo_dispatch?: {
      ngo_name: string
      ngo_phone: string
      mission_status: string
      machinery_assigned: string
      estimated_arrival: string
      co2_saved_tonnes: number
      pm25_saved_kg: number
      action: string
    }
  }>('/charity/stripe/confirm-payment', {
    body: data,
    method: 'POST',
  })
}

export async function syncUnsoldListings(options?: { days_threshold?: number; force_demo?: boolean }) {
  return apiRequest<{ data: Record<string, unknown>[]; count: number }>('/charity/sync-unsold-listings', {
    body: {
      days_threshold: options?.days_threshold ?? 2,
      force_demo: options?.force_demo ?? false,
    },
    method: 'POST',
  })
}

export async function callNgoForCampaign(campaignId: string) {
  return apiRequest<{
    data: {
      status: string
      mission_status: string
      ngo_name: string
      ngo_phone: string
      machinery_assigned: string
      estimated_arrival: string
      co2_saved_tonnes: number
      pm25_saved_kg: number
      action: string
    }
  }>(`/charity/campaigns/${campaignId}/call-ngo`, {
    method: 'POST',
  })
}


