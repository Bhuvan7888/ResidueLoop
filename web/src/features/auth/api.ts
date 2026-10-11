import { supabase } from '@/lib/supabase'
import { apiRequest } from '@/lib/api-client'

export async function signInWithPhonePassword(phone: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    phone,
    password,
  })
  if (error) throw error
  return data
}

export async function signUpWithPhonePassword(phone: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    phone,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error // Ignore not found error
  return data
}

export async function updateProfileRole(role: 'farmer' | 'buyer' | 'donor') {
  return apiRequest<{ id: string; role: string }>('/profiles', {
    method: 'POST',
    body: { role },
  })
}
