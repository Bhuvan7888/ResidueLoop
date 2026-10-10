import { describe, expect, it, vi } from 'vitest'
import { createListing } from './api'

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('@/lib/api-client', () => ({ apiRequest: mocks.apiRequest }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

describe('createListing', () => {
  it('maps the listing form to the FastAPI contract', async () => {
    mocks.apiRequest.mockResolvedValue({ id: 'listing-id' })

    await createListing({
      plotId: 'plot-id', harvestDate: '2026-10-10', combineSmsUsed: true, estTonnes: 5,
    })

    expect(mocks.apiRequest).toHaveBeenCalledWith('/listings', {
      body: {
        plot_id: 'plot-id', harvest_date: '2026-10-10', combine_sms_used: true, est_tonnes: 5,
      },
      method: 'POST',
    })
  })
})
