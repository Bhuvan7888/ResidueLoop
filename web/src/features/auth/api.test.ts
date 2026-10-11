import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signInWithPhonePassword, signUpWithPhonePassword, updateProfileRole } from './api'

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({ apiRequest: mocks.apiRequest }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
    },
  },
}))

describe('updateProfileRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends role selection to the authenticated FastAPI boundary', async () => {
    mocks.apiRequest.mockResolvedValue({ id: 'test-id', role: 'farmer' })

    await expect(updateProfileRole('farmer')).resolves.toEqual({ id: 'test-id', role: 'farmer' })

    expect(mocks.apiRequest).toHaveBeenCalledWith('/profiles', {
      method: 'POST',
      body: { role: 'farmer' },
    })
  })

  it('signs in with an E.164 phone number and password', async () => {
    const response = { data: { session: { access_token: 'token' } }, error: null }
    mocks.signInWithPassword.mockResolvedValue(response)

    await expect(signInWithPhonePassword('+919999999999', 'password123')).resolves.toEqual(response.data)

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      phone: '+919999999999',
      password: 'password123',
    })
  })

  it('creates a phone-and-password account without requesting an OTP', async () => {
    const response = { data: { session: { access_token: 'token' } }, error: null }
    mocks.signUp.mockResolvedValue(response)

    await expect(signUpWithPhonePassword('+919999999999', 'password123')).resolves.toEqual(response.data)

    expect(mocks.signUp).toHaveBeenCalledWith({
      phone: '+919999999999',
      password: 'password123',
    })
  })
})
