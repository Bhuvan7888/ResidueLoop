import { z } from 'zod'

export const phoneSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Phone must be a 10-digit Indian number (e.g. 9999999999)')
})

export const otpSchema = z.object({
  token: z.string().length(6, 'OTP must be 6 digits')
})
