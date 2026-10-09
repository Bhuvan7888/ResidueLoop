import { supabase } from '@/lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface ApiErrorBody {
  error?: { code: string; message: string }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {},
): Promise<T> {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  if (!token) throw new ApiError('unauthenticated', 'Please sign in again')

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    method: options.method ?? 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const payload = (await response.json().catch(() => ({}))) as ApiErrorBody & { data?: T }
  if (!response.ok) {
    throw new ApiError(payload.error?.code ?? 'request_failed', payload.error?.message ?? 'Request failed')
  }
  return payload.data as T
}
