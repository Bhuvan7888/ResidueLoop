import { apiRequest } from '@/lib/api-client'
import { supabase } from '@/lib/supabase'

interface FarmerProfilePayload {
  language: 'en' | 'pa' | 'hi'
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

export async function getFarmerProfile(userId: string) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  const { data: farmer } = await supabase.from('farmers').select('*').eq('profile_id', userId).maybeSingle()
  const { data: idVerif } = await supabase
    .from('id_verifications')
    .select('status, rejection_reason')
    .eq('farmer_id', userId)
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    name: profile?.name,
    phone: profile?.phone,
    language: profile?.language,
    villageId: farmer?.village_id,
    idStatus: farmer?.id_status || idVerif?.status || 'not_submitted',
    rejectionReason: idVerif?.rejection_reason || null,
  }
}

export interface CustomVillagePayload {
  name: string
  district: string
  lat?: number
  lng?: number
}

export function createCustomVillage(payload: CustomVillagePayload): Promise<{ data: { id: string; name: string; district: string } }> {
  return apiRequest('/farmers/villages', {
    body: payload,
    method: 'POST',
  })
}

