import { supabase } from '@/lib/supabase'
import { apiRequest } from '@/lib/api-client'

export async function getMessages(profileId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function simulateWhatsappMessage(phone: string, message: string) {
  return apiRequest('/whatsapp/simulate', {
    method: 'POST',
    body: { phone, message },
  })
}

