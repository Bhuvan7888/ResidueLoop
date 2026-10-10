import { apiRequest } from '@/lib/api-client'

interface FarmerProfilePayload {
  language: 'en' | 'pa'
  name: string
  villageId: string
}

interface PlotPayload {
  acres: number
  lat: number
  lng: number
  villageId: string
}

interface IdVerificationPayload {
  file: File
  idLast4: string
  idType: string
}

export function createFarmerProfile(payload: FarmerProfilePayload): Promise<string> {
  return apiRequest('/farmers/profile', {
    body: { language: payload.language, name: payload.name, village_id: payload.villageId },
    method: 'POST',
  })
}

export function createFarmerPlot(payload: PlotPayload): Promise<{ id: string }> {
  return apiRequest('/farmers/plots', {
    body: { acres: payload.acres, lat: payload.lat, lng: payload.lng, village_id: payload.villageId },
    method: 'POST',
  })
}

export function submitIdVerification(payload: IdVerificationPayload): Promise<{ status: string }> {
  const body = new FormData()
  body.append('file', payload.file)
  body.append('id_type', payload.idType)
  body.append('id_last4', payload.idLast4)
  return apiRequest('/farmers/id_verification', { body, method: 'POST' })
}
