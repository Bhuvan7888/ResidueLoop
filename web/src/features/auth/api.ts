import { supabase } from '@/lib/supabase'

export async function signInWithOtp(phone: string, captchaToken?: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      captchaToken
    }
  })
  if (error) throw error
  return data
}

export async function verifyOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms'
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

export async function updateProfileRole(userId: string, role: string) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ id: userId, role }])
    .select()
    .single()
  
  if (error) throw error
  return data
}
