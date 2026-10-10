import { supabase } from '@/lib/supabase'
import { apiRequest } from '@/lib/api-client'

export async function createBuyerProfile(data: Record<string, unknown>) {
  return apiRequest('/buyers/profile', { body: data, method: 'POST' })
}

export async function createDemandPost(data: Record<string, unknown>) {
  return apiRequest('/buyers/demand', { body: data, method: 'POST' })
}

export async function updateDemandPost(postId: string, data: Record<string, unknown>) {
  return apiRequest(`/buyers/demand/${postId}`, { body: data, method: 'PATCH' })
}

export async function getDemandPosts() {
  const { data, error } = await supabase.from('demand_posts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}
