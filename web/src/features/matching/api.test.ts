import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getMatchedDeals,
  getSingleDeal,
  getDealMessages,
  sendDealMessage,
  handleOfferAction,
} from './api'

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('@/lib/api-client', () => ({ apiRequest: mocks.apiRequest }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

describe('matching and deal API endpoints', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls accept offer action', async () => {
    mocks.apiRequest.mockResolvedValue('success')
    await handleOfferAction('offer-123', 'accept')
    expect(mocks.apiRequest).toHaveBeenCalledWith('/offers/offer-123/action', {
      body: { action: 'accept' },
      method: 'POST',
    })
  })

  it('fetches matched deals with query parameters', async () => {
    mocks.apiRequest.mockResolvedValue([])
    await getMatchedDeals({ userId: 'user-1', role: 'farmer', status: 'accepted' })
    expect(mocks.apiRequest).toHaveBeenCalledWith('/offers/deals?user_id=user-1&role=farmer&status=accepted')
  })

  it('fetches a single deal details', async () => {
    mocks.apiRequest.mockResolvedValue({ id: 'deal-1' })
    await getSingleDeal('deal-1')
    expect(mocks.apiRequest).toHaveBeenCalledWith('/offers/deal-1/deal')
  })

  it('fetches deal messages and posts a new message', async () => {
    mocks.apiRequest.mockResolvedValue([{ id: 'msg-1', text: 'Hello' }])
    const msgs = await getDealMessages('deal-1')
    expect(msgs).toEqual([{ id: 'msg-1', text: 'Hello' }])
    expect(mocks.apiRequest).toHaveBeenCalledWith('/offers/deal-1/messages')

    mocks.apiRequest.mockResolvedValue({ id: 'msg-2', text: 'Tractor on the way' })
    const created = await sendDealMessage('deal-1', {
      message: 'Tractor on the way',
      sender_role: 'buyer',
    })
    expect(created.text).toBe('Tractor on the way')
    expect(mocks.apiRequest).toHaveBeenCalledWith('/offers/deal-1/messages', {
      method: 'POST',
      body: {
        message: 'Tractor on the way',
        sender_role: 'buyer',
      },
    })
  })
})
