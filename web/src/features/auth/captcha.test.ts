import { describe, expect, it } from 'vitest'
import { getCaptchaSiteKey, TURNSTILE_DEVELOPMENT_SITE_KEY } from './captcha'

describe('getCaptchaSiteKey', () => {
  it('uses Cloudflare’s published test key in development', () => {
    expect(getCaptchaSiteKey({
      configuredSiteKey: '0xproduction-key',
      isDevelopment: true,
    })).toBe(TURNSTILE_DEVELOPMENT_SITE_KEY)
  })

  it('uses the configured key outside development', () => {
    expect(getCaptchaSiteKey({
      configuredSiteKey: '0xproduction-key',
      isDevelopment: false,
    })).toBe('0xproduction-key')
  })

  it('does not fall back to the development key outside development', () => {
    expect(getCaptchaSiteKey({
      configuredSiteKey: undefined,
      isDevelopment: false,
    })).toBe('')
  })
})
