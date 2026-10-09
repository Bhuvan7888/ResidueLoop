import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateProfileRole } from './api'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}))

describe('updateProfileRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should include phone when inserting profile', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'test-id', role: 'farmer', phone: '+919999999999' }, error: null })
      })
    })

    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
    
    // Type casting to bypass readonly mocked types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from as any) = mockFrom
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'test-id', phone: '+919999999999' } },
      error: null
    })

    await updateProfileRole('test-id', 'farmer')

    expect(mockInsert).toHaveBeenCalledWith([
      { id: 'test-id', role: 'farmer', phone: '+919999999999' }
    ])
  })
})
