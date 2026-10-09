import { apiRequest } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export function createBuyerProfile(data: Record<string, unknown>) {
  return apiRequest('/buyers/profile', { body: data })
}

export function createDemandPost(data: Record<string, unknown>) {
  return apiRequest('/buyers/demand', { body: data })
}

export function updateDemandPost(postId: string, data: Record<string, unknown>) {
  return apiRequest(`/buyers/demand/${postId}`, { method: 'PATCH', body: data })
}

export async function getDemandPosts() {
  const { data, error } = await supabase.from('demand_posts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}
