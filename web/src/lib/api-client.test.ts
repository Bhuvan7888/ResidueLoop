import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './api-client'
import { supabase } from './supabase'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

describe('apiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sends mutations to FastAPI with the current Supabase access token', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'access-token' } },
      error: null,
    } as never)
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: { id: 'listing-id' } }), { status: 200 }))

    await expect(apiRequest<{ id: string }>('/listings', {
      body: { plot_id: 'plot-id' },
      method: 'POST',
    })).resolves.toEqual({ id: 'listing-id' })

    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/v1/listings', expect.objectContaining({
      body: JSON.stringify({ plot_id: 'plot-id' }),
      headers: expect.objectContaining({
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      }),
      method: 'POST',
    }))
  })

  it('uses the API error message instead of attempting an Edge Function call', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as never)
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Authentication required' } }), { status: 401 }))

    await expect(apiRequest('/listings', { method: 'POST' })).rejects.toThrow('Authentication required')
  })

  it('preserves multipart data for the encrypted ID-upload endpoint', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as never)
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: { status: 'verified' } }), { status: 200 }))
    const body = new FormData()
    body.append('id_last4', '1234')

    await apiRequest('/farmers/id_verification', { body, method: 'POST' })

    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/v1/farmers/id_verification', expect.objectContaining({
      body,
      headers: {},
      method: 'POST',
    }))
  })
})
