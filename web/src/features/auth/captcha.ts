export const TURNSTILE_DEVELOPMENT_SITE_KEY = '1x00000000000000000000AA'

interface CaptchaSiteKeyOptions {
  configuredSiteKey?: string
  isDevelopment: boolean
}

export function getCaptchaSiteKey({ configuredSiteKey, isDevelopment }: CaptchaSiteKeyOptions): string {
  if (isDevelopment) {
    return TURNSTILE_DEVELOPMENT_SITE_KEY
  }

  return configuredSiteKey ?? ''
}
