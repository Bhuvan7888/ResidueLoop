import { z } from 'zod'

export const phoneSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Phone must be a 10-digit Indian number (e.g. 9999999999)')
})

export const phonePasswordSchema = phoneSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be 72 characters or fewer'),
})
