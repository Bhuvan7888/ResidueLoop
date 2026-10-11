import { describe, it, expect } from 'vitest'
import { phonePasswordSchema, phoneSchema } from './schemas'

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

describe('phonePasswordSchema', () => {
  it('accepts a valid Indian phone number and password', () => {
    const result = phonePasswordSchema.safeParse({ phone: '9999999999', password: 'password123' })
    expect(result.success).toBe(true)
  })

  it('rejects a password shorter than eight characters', () => {
    const result = phonePasswordSchema.safeParse({ phone: '9999999999', password: 'short' })
    expect(result.success).toBe(false)
  })
})
