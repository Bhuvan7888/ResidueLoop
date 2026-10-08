import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getProfile } from './api'

export type UserRole = 'farmer' | 'buyer' | 'donor' | 'ngo'

export interface AuthState {
  session: Session | null
  role: UserRole | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    role: null,
    loading: true,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionUpdate(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSessionUpdate(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSessionUpdate = async (session: Session | null) => {
    if (!session) {
      setState({ session: null, role: null, loading: false })
      return
    }

    try {
      const profile = await getProfile(session.user.id)
      setState({
        session,
        role: profile?.role || null,
        loading: false,
      })
    } catch (err) {
      console.error('Error fetching profile:', err)
      setState({ session, role: null, loading: false })
    }
  }

  return state
}
