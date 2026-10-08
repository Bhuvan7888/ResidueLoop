import { supabase } from '@/lib/supabase'

export async function createBuyerProfile(data: Record<string, unknown>) {
  const { data: res, error } = await supabase.functions.invoke('api/v1/buyers/profile', {
    body: data
  })
  if (error) throw error
  return res
}

export async function createDemandPost(data: Record<string, unknown>) {
  const { data: res, error } = await supabase.functions.invoke('api/v1/buyers/demand', {
    body: data
  })
  if (error) throw error
  return res
}

export async function updateDemandPost(postId: string, data: Record<string, unknown>) {
  const { data: res, error } = await supabase.functions.invoke(`api/v1/buyers/demand/${postId}`, {
    body: data,
    method: 'PATCH'
  })
  if (error) throw error
  return res
}

export async function getDemandPosts() {
  const { data, error } = await supabase.from('demand_posts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}
