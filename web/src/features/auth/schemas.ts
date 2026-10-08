import { z } from 'zod'

export const phoneSchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/, 'Phone must be a valid +91 number (e.g. +919999999999)')
})

export const otpSchema = z.object({
  token: z.string().length(6, 'OTP must be 6 digits')
})
