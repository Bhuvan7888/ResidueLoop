import { supabase } from '@/lib/supabase'

export async function getMessages(profileId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}
