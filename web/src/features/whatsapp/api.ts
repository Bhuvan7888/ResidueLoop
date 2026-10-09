import { supabase } from '@/lib/supabase'

export interface TimelineMessage {
  id: string
  direction: 'in' | 'out'
  raw_text: string
  intent: string | null
  created_at: string
}

export async function getMessages(): Promise<TimelineMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, direction, raw_text, intent, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as TimelineMessage[]
}
