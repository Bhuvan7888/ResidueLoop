import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBuyerProfile, createDemandPost } from './api'

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('@/lib/api-client', () => ({ apiRequest: mocks.apiRequest }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

describe('buyer API payloads', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps a buyer profile to FastAPI field names', async () => {
    mocks.apiRequest.mockResolvedValue(undefined)

    await createBuyerProfile({
      orgName: 'Moga Biomass', type: 'biomass', lat: 30.82, lng: 75.17,
      capacity: 200, pricePerTonne: 1800, minLoadTonnes: 8,
    })

    expect(mocks.apiRequest).toHaveBeenCalledWith('/buyers/profile', {
      body: {
        org_name: 'Moga Biomass', type: 'biomass', lat: 30.82, lng: 75.17,
        capacity: 200, price_per_tonne: 1800, min_load_tonnes: 8,
      },
      method: 'POST',
    })
  })

  it('maps a demand post to FastAPI field names', async () => {
    mocks.apiRequest.mockResolvedValue({ id: 'demand-id' })

    await createDemandPost({
      tonnesNeeded: 20, pricePerTonne: 1800, lat: 30.82, lng: 75.17,
      dateFrom: '2026-10-10', dateTo: '2026-10-20',
    })

    expect(mocks.apiRequest).toHaveBeenCalledWith('/buyers/demand', {
      body: {
        tonnes_needed: 20, price_per_tonne: 1800, lat: 30.82, lng: 75.17,
        date_from: '2026-10-10', date_to: '2026-10-20',
      },
      method: 'POST',
    })
  })
})
