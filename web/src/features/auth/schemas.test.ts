import { describe, it, expect } from 'vitest'
import { phoneSchema } from './schemas'

describe('phoneSchema', () => {
  it('should accept a 10-digit number', () => {
    const result = phoneSchema.safeParse({ phone: '9999999999' })
    expect(result.success).toBe(true)
  })

  it('should reject numbers with country codes', () => {
    const result = phoneSchema.safeParse({ phone: '+919999999999' })
    expect(result.success).toBe(false)
  })

  it('should reject non-10-digit numbers', () => {
    const result = phoneSchema.safeParse({ phone: '12345' })
    expect(result.success).toBe(false)
  })
})
