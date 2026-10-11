import { apiRequest } from '@/lib/api-client'

export interface VerificationRecord {
  id?: string
  plot_id: string
  verdict: 'verified' | 'fire_detected' | 'inconclusive'
  confidence: string
  firms_hits: number
  nbr_delta: number
  window_start: string
  window_end: string
  checked_at?: string
}

export async function triggerVerification(
  plotId: string,
  scenario: 'verified' | 'fire_detected' | 'inconclusive' | 'real' = 'real'
) {
  return apiRequest<{ data: VerificationRecord }>(`/verifications/trigger/${plotId}?scenario=${scenario}`, {
    method: 'POST',
  })
}

export async function getPlotVerifications(plotId: string) {
  return apiRequest<{ data: VerificationRecord[] }>(`/verifications/plot/${plotId}`, {
    method: 'GET',
  })
}

