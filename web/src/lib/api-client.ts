import { supabase } from './supabase'

interface ApiErrorPayload {
  error?: {
    message?: string
  }
}

interface ApiRequestOptions {
  body?: unknown
  method?: 'GET' | 'POST' | 'PATCH'
}

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '')

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    method: options.method || 'GET',
  })

  if (!response.ok) {
    const payload = await response.json().catch((): ApiErrorPayload => ({})) as ApiErrorPayload
    throw new Error(payload.error?.message || 'Request failed. Please try again.')
  }

  const payload = await response.json() as { data: T }
  return payload.data
}
