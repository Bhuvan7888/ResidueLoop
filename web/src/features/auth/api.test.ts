import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateProfileRole } from './api'

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('@/lib/api-client', () => ({ apiRequest: mocks.apiRequest }))

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
})
