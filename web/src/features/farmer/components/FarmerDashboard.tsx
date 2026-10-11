import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { NewListingForm } from '@/features/listing/components/NewListingForm'
import { createListing, getPlots, getListings, deleteListing } from '@/features/listing/api'
import { getOffers, handleOfferAction, getPools, getMatchedDeals, type MatchedDeal } from '@/features/matching/api'
import { OfferCard } from '@/features/matching/components/OfferCard'
import { DealCard } from '@/features/matching/components/DealCard'
import { DealChatModal } from '@/features/matching/components/DealChatModal'
import { PoolProgress } from '@/features/matching/components/PoolProgress'
import { getPickups, updatePickupPayment } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'
import { getNotifications, requestAssistance } from '@/features/charity/api'
import { getMessages } from '@/features/whatsapp/api'
import { WhatsappSimulator } from '@/features/whatsapp/components/WhatsappSimulator'
import { AssistanceRequestForm } from '@/features/charity/components/AssistanceRequestForm'
import { getFarmerProfile } from '@/features/farmer/api'
import { FarmerSetup } from './FarmerSetup'

interface PoolData {
  id: string
  status: string
  target_tonnes: number
  current_tonnes: number
  pickup_date: string | null
  village_id?: string
  villages?: { name: string }
}

const INDUSTRY_NAMES_HI: Record<string, string> = {
  biomass_plant: 'बायोमास प्लांट',
  brick_kiln: 'ईंट भट्ठा',
  paper_mill: 'पेपर मिल',
  packaging: 'पैकेजिंग उद्योग',
  paper_packaging: 'पेपर एवं पैकेजिंग',
  cattle_feed: 'पशु आहार',
  thermal_power: 'थर्मल पावर',
  bio_cng: 'बायो-सीएनजी',
  briquettes_pellets: 'ब्रिकेट्स / छर्रे',
}

const INDUSTRY_NAMES_PA: Record<string, string> = {
  biomass_plant: 'ਬਾਇਓਮਾਸ ਪਲਾਂਟ',
  brick_kiln: 'ਇੱਟਾਂ ਦਾ ਭੱਠਾ',
  paper_mill: 'ਪੇਪਰ ਮਿੱਲ',
  packaging: 'ਪੈਕੇਜਿੰਗ',
  paper_packaging: 'ਪੇਪਰ ਤੇ ਪੈਕੇਜਿੰਗ',
  cattle_feed: 'ਪਸ਼ੂ ਚਾਰਾ',
  thermal_power: 'ਥਰਮਲ ਪਾਵਰ',
  bio_cng: 'ਬਾਇਓ-ਸੀਐਨਜੀ',
  briquettes_pellets: 'ਬ੍ਰਿਕੇਟਸ',
}

function getIndustryDisplay(purpose: string, lang: string): string {
  const key = purpose.toLowerCase().trim()
  if (lang === 'hi' && INDUSTRY_NAMES_HI[key]) return INDUSTRY_NAMES_HI[key]
  if (lang === 'pa' && INDUSTRY_NAMES_PA[key]) return INDUSTRY_NAMES_PA[key]
  return purpose.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function translateNotification(msg: string, lang: string): string {
  if (lang !== 'hi' && lang !== 'pa') return msg

  const matchRegex = /Your listing of ([\d.]+) tonnes has matched with (.+?) at ₹?(\d+)\/tonne!?/i
  const m = msg.match(matchRegex)
  if (m) {
    const [, tonnes, buyer, price] = m
    if (lang === 'hi') {
      return `आपकी ${tonnes} टन की लिस्टिंग का ${buyer} के साथ ₹${price}/टन पर मिलान हो गया!`
    }
    if (lang === 'pa') {
      return `ਤੁਹਾਡੀ ${tonnes} ਟਨ ਦੀ ਲਿਸਟਿੰਗ ਦਾ ${buyer} ਨਾਲ ₹${price}/ਟਨ 'ਤੇ ਮਿਲਾਨ ਹੋ ਗਿਆ!`
    }
  }

  if (msg.includes('Cloud cover obscured optical pass') || msg.includes('Inconclusive')) {
    if (lang === 'hi') return 'सैटेलाइट जाँच अस्पष्ट: बादलों के कारण ऑप्टिकल पास बाधित। पुनर्जाँच निर्धारित।'
    if (lang === 'pa') return 'ਸੈਟੇਲਾਈਟ ਜਾਂਚ ਅਸਪਸ਼ਟ: ਬੱਦਲਾਂ ਕਾਰਨ ਆਪਟੀਕਲ ਪਾਸ ਰੁਕ ਗਿਆ। ਮੁੜ ਜਾਂਚ ਤਹਿ ਕੀਤੀ ਗਈ।'
  }

  if (msg.includes('Thermal fire anomaly detected') || msg.includes('Verification flagged')) {
    if (lang === 'hi') return 'सैटेलाइट चेतावनी: आपके खेत में थर्मल आग का पता चला। सत्यापन चिह्नित।'
    if (lang === 'pa') return 'ਸੈਟੇਲਾਈਟ ਚੇਤਾਵਨੀ: ਤੁਹਾਡੇ ਖੇਤ ਵਿੱਚ ਅੱਗ ਦੀ ਗਤੀਵਿਧੀ ਪਾਈ ਗਈ। ਤਸਦੀਕ ਫਲੈਗ ਕੀਤੀ ਗਈ।'
  }

  if (msg.includes('verified clean of fire') || msg.includes('Zero burn scars')) {
    if (lang === 'hi') return 'सैटेलाइट जाँच: खेत आग से पूरी तरह मुक्त सत्यापित! सेंटिनल-2 द्वारा कोई बर्न स्कार नहीं मिला।'
    if (lang === 'pa') return 'ਸੈਟੇਲਾਈਟ ਜਾਂਚ: ਖੇਤ ਅੱਗ ਤੋਂ ਪੂਰੀ ਤਰ੍ਹਾਂ ਮੁਕਤ ਤਸਦੀਕ! ਸੈਂਟੀਨਲ-2 ਦੁਆਰਾ ਕੋਈ ਬਰਨ ਸਕਾਰ ਨਹੀਂ ਮਿਲਿਆ।'
  }

  return msg
}

function getStubbleFormDisplay(formName: string | undefined, combineSms: boolean | undefined, lang: string): string {
  const raw = formName || (combineSms ? 'Delivered Bales' : 'Farm-Gate Loose')
  if (lang === 'hi') {
    if (raw.toLowerCase().includes('loose') || raw.toLowerCase().includes('farm-gate')) {
      return 'खेत पर खुली पराली (लूस)'
    }
    if (raw.toLowerCase().includes('bale') || raw.toLowerCase().includes('delivered')) {
      return 'गांठें पहुँचाई गईं (15–50 किमी)'
    }
    if (raw.toLowerCase().includes('feed') || raw.toLowerCase().includes('silage')) {
      return 'व्यावसायिक पशु चारा ग्रेड'
    }
    if (raw.toLowerCase().includes('depot')) {
      return 'डिपो एकत्रीकरण'
    }
  }
  if (lang === 'pa') {
    if (raw.toLowerCase().includes('loose') || raw.toLowerCase().includes('farm-gate')) {
      return 'ਖੇਤ ਵਿੱਚ ਖੁੱਲ੍ਹੀ ਪਰਾਲੀ (ਲੂਜ਼)'
    }
    if (raw.toLowerCase().includes('bale') || raw.toLowerCase().includes('delivered')) {
      return 'ਗੰਢਾਂ ਪਹੁੰਚਾਈਆਂ ਗਈਆਂ (15–50 ਕਿਲੋਮੀਟਰ)'
    }
    if (raw.toLowerCase().includes('feed') || raw.toLowerCase().includes('silage')) {
      return 'ਵਪਾਰਕ ਪਸ਼ੂ ਚਾਰਾ ਗ੍ਰੇਡ'
    }
  }
  return raw
}

function getPriceRangeDisplay(range: string | undefined, combineSms: boolean | undefined, lang: string): string {
  const raw = range || (combineSms ? '₹1,330 to ₹3,000/t' : '₹500 to ₹700/t')
  if (lang === 'hi') {
    return raw
      .replace(/\bto\b/g, 'से')
      .replace(/\/t\b/g, '/टन')
      .replace(/\/qtl\b/g, '/कुंतल')
  }
  if (lang === 'pa') {
    return raw
      .replace(/\bto\b/g, 'ਤੋਂ')
      .replace(/\/t\b/g, '/ਟਨ')
      .replace(/\/qtl\b/g, '/ਕੁਇੰਟਲ')
  }
  return raw
}

function getQualityGradeDisplay(grade: string | undefined, combineSms: boolean | undefined, lang: string): string {
  if (lang === 'hi') {
    if (grade === 'grade_a_plus') return 'ग्रेड ए+ प्रीमियम गोल्डन'
    if (grade === 'grade_a_sms' || combineSms) return 'ग्रेड ए (एसएमएस कटा हुआ)'
    return 'ग्रेड बी औद्योगिक'
  }
  if (lang === 'pa') {
    if (grade === 'grade_a_plus') return 'ਗ੍ਰੇਡ ਏ+ ਪ੍ਰੀਮੀਅਮ ਗੋਲਡਨ'
    if (grade === 'grade_a_sms' || combineSms) return 'ਗ੍ਰੇਡ ਏ (ਐਸਐਮਐਸ ਕੱਟਿਆ)'
    return 'ਗ੍ਰੇਡ ਬੀ ਉਦਯੋਗਿਕ'
  }
  if (grade === 'grade_a_plus') return 'Grade A+ Premium Golden'
  if (grade === 'grade_a_sms' || combineSms) return 'Grade A (SMS Chopped)'
  return 'Grade B Industrial'
}

export function FarmerDashboard({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'listing' | 'dashboard' | 'assistance'>('dashboard')
  const [activeListing, setActiveListing] = useState<string | null>(null)
  const [listings, setListings] = useState<
    {
      id: string
      plot_id?: string
      acres?: number
      status: string
      harvest_date: string
      source: string
      created_at?: string
      plots?: { acres: number }
      est_tonnes?: number
      pool_id?: string | null
      quality_grade?: string
      stubble_form?: string
      stubble_form_name?: string
      market_price_range?: string
      intended_purposes?: string[]
      moisture_level?: string
      price_per_tonne?: number
      total_price?: number
      combine_sms_used?: boolean
      procurement_advice?: {
        decision: string
        badge: string
        quality_grade: string
        stubble_form?: string
      }
    }[]
  >([])
  
  const { data: plots = [] } = useQuery({
    queryKey: ['plots', userId],
    queryFn: () => getPlots(userId),
    enabled: !!userId,
  })

  const { data: farmerProfile } = useQuery({
    queryKey: ['farmerProfile', userId],
    queryFn: () => getFarmerProfile(userId),
    enabled: !!userId,
  })

  const [offers, setOffers] = useState<
    { id: string; status: string; price_per_tonne: number; pickup_start?: string; pickup_end?: string; buyers?: { org_name: string }; balers?: { name: string } }[]
  >([])
  const [matchedDeals, setMatchedDeals] = useState<MatchedDeal[]>([])
  const [selectedChatOfferId, setSelectedChatOfferId] = useState<string | null>(null)
  const [pools, setPools] = useState<PoolData[]>([])
  const [pickups, setPickups] = useState<
    { id: string; pool_id: string; actual_tonnes: number | null; amount_due: number | null; payment_status: string; quality_notes?: string | null; pools: { pickup_date: string | null } }[]
  >([])
  const [messages, setMessages] = useState<{ id: string; direction: string; raw_text: string; created_at: string }[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const reloadData = useCallback(() => {
    getOffers().then((data) => setOffers((data as unknown as typeof offers) || [])).catch(console.error)
    getMatchedDeals({ userId, role: 'farmer' }).then((data) => setMatchedDeals(data || [])).catch(console.error)
    getPickups().then(setPickups).catch(console.error)
    getPools().then((data) => setPools((data as unknown as PoolData[]) || [])).catch(console.error)
    getListings(userId).then(setListings).catch(console.error)
    getMessages(userId).then(setMessages).catch(console.error)
    if (userId) {
      getNotifications(userId).then(setNotifications).catch(console.error)
    }
  }, [userId])

  useEffect(() => {
    reloadData()
    const interval = setInterval(reloadData, 3500)
    return () => clearInterval(interval)
  }, [reloadData])

  const isVerified = farmerProfile?.idStatus === 'verified'
  const idStatus = farmerProfile?.idStatus || 'not_submitted'

  const totalReceived = pickups
    .filter((p) => p.payment_status === 'received')
    .reduce((sum, p) => sum + (p.amount_due || 0), 0)

  const totalPending = pickups
    .filter((p) => p.payment_status !== 'received')
    .reduce((sum, p) => sum + (p.amount_due || 0), 0) || (listings.length > 0 && totalReceived === 0 ? listings.reduce((sum, l) => sum + ((l.est_tonnes || 0) * (l.price_per_tonne || (l.combine_sms_used ? 1850 : 600))), 0) : 0)

  const hasCompleted = pickups.some((p) => p.payment_status === 'received')
  const hasPickupWeighed = pickups.some((p) => p.actual_tonnes && p.actual_tonnes > 0)
  const hasScheduled = pickups.some((p) => p.pools?.pickup_date)
  const hasPooled = listings.some((l) => l.status === 'pooled') || pools.length > 0
  const hasMatched = listings.some((l) => l.status === 'matched') || offers.length > 0

  const pickupStep = hasCompleted ? 3 : (hasPickupWeighed || hasScheduled) ? 3 : hasPooled ? 2 : hasMatched ? 1 : 0
  const latestPickup = pickups[0]
  const nextPickupDate = latestPickup?.pools?.pickup_date 
    ? new Date(latestPickup.pools.pickup_date).toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'pa' ? 'pa-IN' : 'en-IN', { day: 'numeric', month: 'short' })
    : null

  const topOfferRate = offers.length > 0 
    ? Math.max(...offers.map((o) => o.price_per_tonne || 0), 0)
    : matchedDeals.length > 0
    ? Math.max(...matchedDeals.map((d) => d.price_per_tonne || 0), 0)
    : 0

  const handleQuickCharityList = async (listingId: string) => {
    try {
      await requestAssistance({ listing_id: listingId, purpose: 'Urgent citizen crowdfunding clearance to avoid burning' })
      setActionMsg(i18n.language === 'hi' ? '🌾 पराली सफलतापूर्वक नागरिक चैरिटी पोर्टल पर जोड़ दी गई!' : '🌾 Stubble successfully listed on the Citizen Charity Crowdfunding Portal!')
      reloadData()
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to list on charity portal')
    }
  }

  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm(i18n.language === 'hi' ? 'क्या आप वाकई इस लिस्टिंग को हटाना चाहते हैं?' : i18n.language === 'pa' ? 'ਕੀ ਤੁਸੀਂ ਵਾਕਈ ਇਸ ਲਿਸਟਿੰਗ ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?' : 'Are you sure you want to cancel this listing?')) {
      return
    }
    try {
      await deleteListing(listingId)
      setActionMsg(i18n.language === 'hi' ? '✓ लिस्टिंग सफलतापूर्वक हटा दी गई' : i18n.language === 'pa' ? '✓ ਲਿਸਟਿੰਗ ਸਫਲਤਾਪੂਰਵਕ ਹਟਾਈ ਗਈ' : '✓ Listing cancelled successfully')
      reloadData()
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to cancel listing')
    }
  }

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div className="rounded-xl bg-state-success-dim border border-state-success/30 p-4 text-sm text-state-success flex items-center justify-between">
          <p className="font-medium">{actionMsg}</p>
          <button onClick={() => setActionMsg(null)} className="text-xs uppercase font-semibold">✕</button>
        </div>
      )}

      {view === 'listing' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Aligned Listing Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-surface-border p-4 rounded-2xl shadow-xs">
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-bg-subtle hover:bg-surface-border text-copy-primary rounded-xl font-semibold text-sm transition-all self-start sm:self-auto cursor-pointer"
            >
              ← {t('common.back', 'Back to Dashboard')}
            </button>
            <div className="text-center">
              <h3 className="font-bold text-copy-primary text-base">🌾 {t('farmer.new_listing', 'Sell Stubble (New Listing)')}</h3>
              <p className="text-xs text-copy-secondary">{t('farmer.three_simple_steps', '2 Simple Steps • Fair Market Price')}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-copy-secondary bg-bg-subtle border border-surface-border px-3 py-1.5 rounded-full self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
              <span className="font-medium text-copy-primary">{t('farmer.live_sync')}</span>
              <span>•</span>
              <span className="font-mono text-state-success">🔒 {t('farmer.e2e_encrypted')}</span>
            </div>
          </div>

          {plots.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center space-y-3">
              <h4 className="text-lg font-medium text-copy-primary">
                {i18n.language === 'hi' ? 'कोई खेत पंजीकृत नहीं है' : i18n.language === 'pa' ? 'ਕੋਈ ਖੇਤ ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ' : 'No plots registered'}
              </h4>
              <p className="text-copy-secondary text-sm">
                {i18n.language === 'hi' ? 'लिस्टिंग बनाने से पहले कृपया अपने खेत का विवरण जोड़ें।' : i18n.language === 'pa' ? 'ਲਿਸਟਿੰਗ ਬਣਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਖੇਤ ਦਾ ਵੇਰਵਾ ਸ਼ਾਮਲ ਕਰੋ।' : 'Please register at least one plot before creating a listing.'}
              </p>
              <button onClick={() => setView('dashboard')} className="px-5 py-2.5 bg-brand text-on-brand rounded-xl text-sm font-bold">
                {i18n.language === 'hi' ? 'डैशबोर्ड पर वापस' : i18n.language === 'pa' ? 'ਡੈਸ਼ਬੋਰਡ ਵੱਲ ਵਾਪਸ' : 'Back to Dashboard'}
              </button>
            </div>
          ) : (
            <NewListingForm 
              plots={plots.map((p, idx) => ({ id: p.id, name: `${t('farmer.plot_num')}${idx + 1}`, acres: p.acres }))}
              activePlotIds={listings.filter((l) => l.status !== 'completed' && l.status !== 'cancelled').map((l) => l.plot_id).filter((id): id is string => Boolean(id))}
              onSubmit={async (data) => {
                await createListing(data)
                await queryClient.invalidateQueries({ queryKey: ['heatmap'] })
                reloadData()
                setView('dashboard')
              }} 
              onCancel={() => setView('dashboard')} 
            />
          )}
        </div>
      )}

      {view === 'assistance' && activeListing && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between bg-surface border border-surface-border p-4 rounded-2xl shadow-xs">
            <button
              onClick={() => setView('dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-bg-subtle hover:bg-surface-border text-copy-primary rounded-xl font-semibold text-sm transition-all"
            >
              ← {t('common.back', 'Back to Dashboard')}
            </button>
            <h3 className="font-bold text-copy-primary">🌾 {t('charity.assistance_title', 'Citizen Crowdfunding Assistance')}</h3>
          </div>
          <AssistanceRequestForm 
            listingId={activeListing}
            onSubmit={() => { reloadData(); setView('dashboard') }}
            onCancel={() => setView('dashboard')}
          />
        </div>
      )}

      {view === 'dashboard' && (
        <div className="space-y-8">
          {/* Header Sync Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (!isVerified) {
                    setActionMsg(i18n.language === 'hi' ? '⚠️ सत्यापित पहचान आवश्यक! लिस्टिंग बनाने से पहले कृपया ऊपर अपना पहचान प्रमाण जमा करें।' : i18n.language === 'pa' ? '⚠️ ਤਸਦੀਕਸ਼ੁਦਾ ਪਛਾਣ ਲੋੜੀਂਦੀ ਹੈ! ਕਿਰਪਾ ਕਰਕੇ ਲਿਸਟਿੰਗ ਬਣਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਆਪਣੀ ਪਛਾਣ ਦਾ ਸਬੂਤ ਜਮ੍ਹਾਂ ਕਰੋ।' : '⚠️ Verified ID required! Please submit and verify your ID proof before creating a listing.')
                    return
                  }
                  setView('listing')
                }}
                className={`px-4 py-2 rounded-xl font-bold text-sm shadow-xs transition-all ${
                  isVerified
                    ? 'bg-brand text-on-brand hover:bg-accent-secondary'
                    : 'bg-bg-subtle text-copy-muted border border-surface-border cursor-not-allowed opacity-80'
                }`}
              >
                + {t('farmer.new_listing', 'Sell Stubble')}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-copy-secondary bg-surface border border-surface-border px-3 py-1.5 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
              <span className="font-medium text-copy-primary">{t('farmer.live_sync')}</span>
              <span>•</span>
              <span className="font-mono font-medium text-state-success">🔒 {t('farmer.e2e_encrypted')}</span>
            </div>
          </div>

          {/* ID Verification Status Banner */}
          <div className="space-y-3">
            {idStatus === 'verified' && (
              <div className="rounded-2xl bg-state-success-dim border border-state-success/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <h4 className="text-sm font-bold text-state-success">{t('farmer.id_verified_title')}</h4>
                    <p className="text-xs text-copy-secondary">
                      {t('farmer.id_verified_desc')}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-semibold bg-state-success text-white self-start sm:self-auto">
                  {t('farmer.id_verified_badge')}
                </span>
              </div>
            )}

            {idStatus === 'pending' && (
              <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">{t('farmer.id_pending_title')}</h4>
                    <p className="text-xs text-amber-800">
                      {t('farmer.id_pending_desc')}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-semibold bg-amber-200 text-amber-900 self-start sm:self-auto">
                  {t('farmer.id_pending_badge')}
                </span>
              </div>
            )}

            {idStatus === 'rejected' && (
              <div className="rounded-2xl bg-state-error-dim border border-state-error/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h4 className="text-sm font-bold text-state-error">{t('farmer.id_rejected_title')}</h4>
                    <p className="text-xs text-state-error opacity-90">
                      {i18n.language === 'hi'
                        ? `कारण: ${farmerProfile?.rejectionReason || 'दस्तावेज़ फोटो अस्पष्ट या बेमेल है।'} कृपया ऊपर सेटअप अनुभाग में पुनः जमा करें।`
                        : i18n.language === 'pa'
                        ? `ਕਾਰਨ: ${farmerProfile?.rejectionReason || 'ਦਸਤਾਵੇਜ਼ ਫੋਟੋ ਅਸਪਸ਼ਟ ਹੈ।'} ਕਿਰਪਾ ਕਰਕੇ ਉੱਪਰ ਸੈੱਟਅੱਪ ਸੈਕਸ਼ਨ ਵਿੱਚ ਦੁਬਾਰਾ ਜਮ੍ਹਾਂ ਕਰੋ।`
                        : `Reason: ${farmerProfile?.rejectionReason || 'Document photo unreadable or mismatched.'} Please resubmit in the setup section above.`}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-semibold bg-state-error text-white self-start sm:self-auto">
                  {t('farmer.id_rejected_badge')}
                </span>
              </div>
            )}

            {idStatus === 'not_submitted' && (
              <div className="rounded-2xl bg-bg-subtle border border-surface-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <h4 className="text-sm font-bold text-copy-primary">{t('farmer.id_not_submitted_title')}</h4>
                    <p className="text-xs text-copy-secondary">
                      {t('farmer.id_not_submitted_desc')}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-semibold bg-surface border border-surface-border text-copy-secondary self-start sm:self-auto">
                  {t('farmer.id_required_badge')}
                </span>
              </div>
            )}
          </div>

          {/* Real-time Notifications: Payments & Matches */}
          {notifications.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-copy-primary flex items-center gap-1.5">
                  <span>🔔</span> {t('farmer.notifications_title')}
                </h4>
                <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium">
                  {notifications.length} {t('farmer.notifications_updates')}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className="bg-surface border border-brand/30 rounded-xl p-3 shadow-xs text-xs relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand"></div>
                    <p className="font-medium text-copy-primary pl-1">{translateNotification(n.message, i18n.language)}</p>
                    <p className="text-copy-secondary mt-1 pl-1 opacity-70">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= THE MAIN ACTIONS HOME SCREEN ================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-copy-primary flex items-center gap-2">
                <span>🌾</span> {t('farmer.main_actions_title', 'Main Actions')}
              </h3>
              <span className="text-xs text-copy-secondary font-medium">
                {t('farmer.four_simple_steps', '4 Simple Steps')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: 🌾 1. Sell Stubble */}
              <div
                onClick={() => {
                  if (!isVerified) {
                    setActionMsg(i18n.language === 'hi' ? '⚠️ सत्यापित पहचान आवश्यक! लिस्टिंग बनाने से पहले कृपया ऊपर अपना पहचान प्रमाण जमा करें।' : i18n.language === 'pa' ? '⚠️ ਤਸਦੀਕਸ਼ੁਦਾ ਪਛਾਣ ਲੋੜੀਂਦੀ ਹੈ! ਕਿਰਪਾ ਕਰਕੇ ਲਿਸਟਿੰਗ ਬਣਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਆਪਣੀ ਪਛਾਣ ਦਾ ਸਬੂਤ ਜਮ੍ਹਾਂ ਕਰੋ।' : '⚠️ Verified ID required! Please submit and verify your ID proof before creating a listing.')
                    return
                  }
                  setView('listing')
                }}
                className="group relative bg-surface border-2 border-brand/40 hover:border-brand rounded-3xl p-6 text-left transition-all hover:shadow-md hover:scale-[1.01] flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    🌾
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-copy-primary group-hover:text-brand transition-colors">
                      {t('farmer.big_action_sell_title', '1. Sell Stubble')}
                    </h4>
                    <p className="text-xs text-copy-secondary mt-1 leading-relaxed">
                      {t('farmer.big_action_sell_desc', 'Find verified buyers in 2 simple steps')}
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-surface-border-subtle flex items-center justify-between">
                  <span className="text-xs font-bold text-brand">
                    {listings.length > 0 ? `${listings.length} ${t('farmer.active_listings_count', 'Active Listings')}` : t('farmer.start_listing_cta', '+ Create New Listing')}
                  </span>
                  <span className="text-sm font-bold text-brand group-hover:translate-x-1 transition-transform">➔</span>
                </div>
              </div>

              {/* Card 2: 🤝 2. Buyer Offers For You */}
              <div
                onClick={() => {
                  document.getElementById('offers-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="group relative bg-surface border-2 border-accent-primary/40 hover:border-accent-primary rounded-3xl p-6 text-left transition-all hover:shadow-md hover:scale-[1.01] flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    🤝
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-copy-primary group-hover:text-accent-primary transition-colors">
                      {t('farmer.big_action_offers_title', '2. Buyer Offers For You')}
                    </h4>
                    <p className="text-xs text-copy-secondary mt-1 leading-relaxed">
                      {t('farmer.big_action_offers_desc', 'Review & accept prices from verified buyers')}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-surface-border-subtle flex items-center justify-between">
                  {offers.length > 0 || matchedDeals.length > 0 ? (
                    <>
                      <div>
                        <div className="text-2xl font-black text-accent-primary flex items-baseline gap-0.5">
                          {topOfferRate > 0 ? `₹${topOfferRate.toLocaleString('en-IN')}` : `${offers.length + matchedDeals.length}`}
                          {topOfferRate > 0 && <span className="text-xs font-semibold text-copy-secondary">/t</span>}
                        </div>
                        <div className="text-[11px] text-copy-muted font-medium mt-0.5">
                          {offers.length > 0 
                            ? `${offers.length} ${t('farmer.offers_available_desc', 'verified offers ready')}`
                            : `${matchedDeals.length} ${t('farmer.confirmed_deals', 'Deals Active')}`}
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-accent-primary/15 text-accent-primary border border-accent-primary/30 flex items-center gap-1 group-hover:bg-accent-primary group-hover:text-on-brand transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse"></span>
                        {t('farmer.review_now', 'Review')} ➔
                      </span>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-xs font-bold text-copy-secondary">
                          {listings.length > 0 ? t('farmer.matching_active', 'Matching Active...') : t('farmer.create_listing_first', 'List Straw First')}
                        </div>
                        <div className="text-[11px] text-copy-muted font-medium mt-0.5">
                          {listings.length > 0 ? t('farmer.searching_buyers', 'Checking verified buyers') : t('farmer.start_to_receive', 'Offers appear here')}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-accent-primary group-hover:translate-x-1 transition-transform">➔</span>
                    </>
                  )}
                </div>
              </div>

              {/* Card 3: 🚚 3. When is Pickup? */}
              <div
                onClick={() => {
                  document.getElementById('pickups-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="bg-surface border-2 border-surface-border hover:border-accent-primary/60 rounded-3xl p-6 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-3xl">
                    🚚
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-copy-primary">
                      {t('farmer.big_action_pickup_title', '3. When is Pickup?')}
                    </h4>
                    <p className="text-xs text-copy-secondary mt-1 leading-relaxed">
                      {nextPickupDate 
                        ? `${t('farmer.scheduled_on', 'Scheduled for')}: ${nextPickupDate}` 
                        : t('farmer.big_action_pickup_desc', 'Live truck arrival & pickup schedule')}
                    </p>
                  </div>
                </div>
                
                {/* Truck Progress Bar */}
                <div className="mt-5 pt-4 border-t border-surface-border-subtle space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-copy-secondary">
                    <span className={pickupStep >= 1 ? 'text-brand' : ''}>🌾 {t('status.matched', 'Matched')}</span>
                    <span>➔</span>
                    <span className={pickupStep >= 2 ? 'text-brand' : ''}>🚜 {t('status.pooled', 'Pooled')}</span>
                    <span>➔</span>
                    <span className={pickupStep >= 3 ? 'text-state-success' : ''}>🚚 {t('status.completed', 'Completed')}</span>
                  </div>
                  <div className="w-full bg-bg-subtle rounded-full h-2 overflow-hidden border border-surface-border-subtle">
                    <div 
                      className="bg-brand h-full rounded-full transition-all duration-500" 
                      style={{ width: pickupStep === 0 ? '15%' : pickupStep === 1 ? '45%' : pickupStep === 2 ? '75%' : '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: 💰 4. My Money & Payouts */}
              <div
                onClick={() => {
                  document.getElementById('pickups-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="bg-surface border-2 border-state-success/40 hover:border-state-success rounded-3xl p-6 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-state-success/10 flex items-center justify-center text-3xl">
                    💰
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-copy-primary">
                      {t('farmer.big_action_money_title', '4. My Money & Payouts')}
                    </h4>
                    <p className="text-xs text-copy-secondary mt-1 leading-relaxed">
                      {t('farmer.big_action_money_desc', 'Direct bank transfer upon pickup')}
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-surface-border-subtle flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black text-state-success">
                      ₹{totalReceived.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-copy-muted font-medium mt-0.5">
                      {totalPending > 0 ? `₹${totalPending.toLocaleString('en-IN')} ${t('farmer.pending_payout', 'In Progress')}` : t('farmer.payout_up_to_date', 'Account Up to Date')}
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-state-success-dim text-state-success border border-state-success/30">
                    {totalReceived > 0 ? t('farmer.paid_badge', 'Payment Received') : t('farmer.zero_deductions', '100% Guaranteed')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Listings & Pooling */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xl font-bold text-copy-primary flex items-center gap-2">
                  <span>🌾</span> {t('farmer.listings_title', 'My Listed Stubble & Fields')}
                </h3>
                <p className="text-xs text-copy-secondary mt-0.5">
                  {t('farmer.listings_desc', 'Track buyers, scheduled trolley pickup, and guaranteed payments.')}
                </p>
              </div>
              {listings.length > 0 && (
                <span className="text-xs px-3 py-1 rounded-full font-bold bg-brand/10 text-brand border border-brand/20 self-start sm:self-auto">
                  {listings.length} {t('farmer.active_listings_count', 'Active Listings')}
                </span>
              )}
            </div>

            <div className="grid gap-4">
              {listings.length === 0 ? (
                <div className="bg-surface border-2 border-dashed border-surface-border hover:border-brand/40 rounded-3xl p-8 text-center space-y-4 transition-colors">
                  <div className="w-16 h-16 rounded-3xl bg-brand/10 text-brand flex items-center justify-center text-3xl mx-auto">
                    🌾
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-lg font-bold text-copy-primary">
                      {t('farmer.no_listings_title', 'No fields listed yet')}
                    </h4>
                    <p className="text-xs text-copy-secondary leading-relaxed">
                      {t('farmer.no_listings_desc', 'List your paddy straw in 2 simple steps to get fair market prices and free trolley pickup directly from your field.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isVerified) {
                        setActionMsg(i18n.language === 'hi' ? '⚠️ सत्यापित पहचान आवश्यक! लिस्टिंग बनाने से पहले कृपया ऊपर अपना पहचान प्रमाण जमा करें।' : i18n.language === 'pa' ? '⚠️ ਤਸਦੀਕਸ਼ੁਦਾ ਪਛਾਣ ਲੋੜੀਂਦੀ ਹੈ! ਕਿਰਪਾ ਕਰਕੇ ਲਿਸਟਿੰਗ ਬਣਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਆਪਣੀ ਪਛਾਣ ਦਾ ਸਬੂਤ ਜਮ੍ਹਾਂ ਕਰੋ।' : '⚠️ Verified ID required! Please submit and verify your ID proof before creating a listing.')
                        return
                      }
                      setView('listing')
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand text-on-brand text-sm font-extrabold shadow-md hover:bg-accent-secondary transition-all hover:scale-[1.01] cursor-pointer mx-auto"
                  >
                    <span>+</span> {t('farmer.start_listing_cta', 'Sell My Stubble Now')}
                  </button>
                </div>
              ) : (
                listings.map((listing) => {
                  // In Punjab agriculture, 1 acre produces ~2.5 tonnes of paddy straw
                  const derivedAcres = listing.est_tonnes
                    ? Number((listing.est_tonnes / 2.5).toFixed(1))
                    : (listing.acres ?? listing.plots?.acres ?? 0)
                  const acresDisplay = derivedAcres > 0
                    ? (derivedAcres % 1 === 0 ? derivedAcres.toFixed(0) : derivedAcres.toFixed(1))
                    : '?'
                  const isUnsold = listing.status === 'open'
                  const isMatched = listing.status === 'matched'
                  const isPooled = listing.status === 'pooled'
                  const isCompleted = listing.status === 'completed'
                  const linkedPool = listing.pool_id ? pools.find((p) => p.id === listing.pool_id) : null
                  const plotIdx = plots.findIndex((p) => p.id === listing.plot_id)
                  const plotLabel = plotIdx >= 0 ? `${t('farmer.plot_num')}${plotIdx + 1}` : t('farmer.selected_plot_default', 'Plot #1')
                  
                  // 4-step progress: 1. Listed -> 2. Buyer Matched -> 3. Trolley Scheduled -> 4. Money Received
                  const currentStep = isCompleted ? 4 : isPooled ? 3 : isMatched ? 2 : 1
                  const fairRate = listing.price_per_tonne || (listing.combine_sms_used ? 1850 : 600)
                  const estPayout = Math.round((listing.est_tonnes || 0) * fairRate)

                  return (
                    <div key={listing.id} className="bg-surface border-2 border-surface-border hover:border-brand/40 rounded-3xl p-6 space-y-4 shadow-xs transition-all">
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-xl">🌾</span>
                            <h4 className="font-bold text-copy-primary text-base sm:text-lg">
                              {plotLabel} • {acresDisplay} {t('listing.acres', 'acres')}
                              {listing.est_tonnes ? ` (~${listing.est_tonnes.toFixed(1)} ${t('listing.tonnes', 'tonnes')})` : ''}
                            </h4>
                            {listing.source === 'whatsapp' && (
                              <span className="px-2.5 py-0.5 bg-bg-subtle text-copy-secondary text-xs rounded-full flex items-center gap-1 border border-surface-border font-medium">
                                💬 {t('farmer.via_whatsapp')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-copy-secondary">
                            🗓️ {t('farmer.harvest_cut_label', 'Harvest Date')}: <strong className="text-copy-primary">{listing.harvest_date}</strong>
                          </p>
                        </div>

                        {/* Estimated Payout Badge */}
                        <div className="bg-state-success-dim/80 border border-state-success/30 rounded-2xl px-4 py-2 flex flex-col items-start sm:items-end self-start sm:self-auto">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-state-success">
                            💰 {t('farmer.guaranteed_payout', 'Estimated Payout')}
                          </span>
                          <div className="text-xl sm:text-2xl font-black text-state-success">
                            ₹{estPayout.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* 4-Step Timeline Progress Bar */}
                      <div className="bg-bg-subtle/70 rounded-2xl p-4 border border-surface-border-subtle space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold gap-1">
                          <div className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-brand' : 'text-copy-muted'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              currentStep > 1 ? 'bg-brand text-on-brand' : 'bg-brand text-on-brand ring-2 ring-brand/30'
                            }`}>
                              {currentStep > 1 ? '✓' : '1'}
                            </span>
                            <span className="truncate">{t('farmer.step_listed', 'Listed')}</span>
                          </div>

                          <div className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-brand' : 'text-copy-muted'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              currentStep >= 2 ? 'bg-brand text-on-brand ring-2 ring-brand/30' : 'bg-surface border border-surface-border'
                            }`}>
                              {currentStep > 2 ? '✓' : '2'}
                            </span>
                            <span className="truncate">{t('farmer.step_matched', 'Buyer Matched')}</span>
                          </div>

                          <div className={`flex items-center gap-1.5 ${currentStep >= 3 ? 'text-brand' : 'text-copy-muted'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              currentStep >= 3 ? 'bg-brand text-on-brand ring-2 ring-brand/30' : 'bg-surface border border-surface-border'
                            }`}>
                              {currentStep > 3 ? '✓' : '3'}
                            </span>
                            <span className="truncate">{t('farmer.step_trolley', 'Trolley Scheduled')}</span>
                          </div>

                          <div className={`flex items-center gap-1.5 ${currentStep >= 4 ? 'text-state-success' : 'text-copy-muted'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              currentStep >= 4 ? 'bg-state-success text-white ring-2 ring-state-success/30' : 'bg-surface border border-surface-border'
                            }`}>
                              {currentStep >= 4 ? '✓' : '4'}
                            </span>
                            <span className="truncate">{t('farmer.step_paid', 'Money Received')}</span>
                          </div>
                        </div>

                        {/* Progress track line */}
                        <div className="w-full bg-surface-border-subtle rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${currentStep >= 4 ? 'bg-state-success' : 'bg-brand'}`}
                            style={{ width: currentStep === 1 ? '25%' : currentStep === 2 ? '50%' : currentStep === 3 ? '75%' : '100%' }}
                          />
                        </div>
                      </div>

                      {/* Everyday Friendly Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-bg-subtle/50 p-3 rounded-2xl border border-surface-border/40">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-copy-muted block">
                            🚜 {t('farmer.straw_type_label', 'Straw Type')}
                          </span>
                          <strong className="text-copy-primary text-sm mt-1 block truncate">
                            {getStubbleFormDisplay(listing.stubble_form_name, listing.combine_sms_used, i18n.language)}
                          </strong>
                          <span className="text-[11px] text-brand font-medium mt-0.5 block">
                            {getPriceRangeDisplay(listing.market_price_range, listing.combine_sms_used, i18n.language)}
                          </span>
                        </div>

                        <div className="bg-bg-subtle/50 p-3 rounded-2xl border border-surface-border/40">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-copy-muted block">
                            ⭐ {t('farmer.quality_moisture', 'Quality & Grade')}
                          </span>
                          <strong className="text-copy-primary text-sm mt-1 block truncate">
                            {getQualityGradeDisplay(listing.quality_grade, listing.combine_sms_used, i18n.language)}
                          </strong>
                          <span className="text-[11px] text-copy-secondary mt-0.5 block">
                            {i18n.language === 'hi' ? 'नमी: ' : i18n.language === 'pa' ? 'ਨਮੀ: ' : 'Moisture: '}{listing.moisture_level || (listing.combine_sms_used ? '12-15%' : '15-20%')}
                          </span>
                        </div>

                        <div className="bg-bg-subtle/50 p-3 rounded-2xl border border-surface-border/40">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-copy-muted block">
                            💵 {t('farmer.agreed_rate_label', 'Fair Rate')}
                          </span>
                          <strong className="text-state-success text-sm mt-1 block">
                            ₹{fairRate.toLocaleString()}/{t('listing.tonnes', 'tonne')}
                          </strong>
                          <span className="text-[11px] text-copy-secondary mt-0.5 block">
                            {t('farmer.zero_deductions', '100% Guaranteed')}
                          </span>
                        </div>
                      </div>

                      {/* Suitable Industries */}
                      {listing.intended_purposes && listing.intended_purposes.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1">
                          <span className="text-copy-muted font-medium">{t('farmer.target_industries')}</span>
                          {listing.intended_purposes.map((p) => (
                            <span key={p} className="px-2.5 py-1 rounded-xl bg-brand/10 text-brand font-bold">
                              {getIndustryDisplay(p, i18n.language)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* If listing is pooled, display the live PoolProgress! */}
                      {isPooled && (
                        <div className="pt-2 border-t border-surface-border/50">
                          <PoolProgress pool={linkedPool || undefined} />
                        </div>
                      )}

                      {/* Bottom Status & Assistance Bar */}
                      <div className="pt-3 border-t border-surface-border-subtle flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="text-xs">
                          {isUnsold ? (
                            <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                              <span>⏳</span> {t('farmer.field_status_searching', 'Searching 10+ nearby factories & balers...')}
                            </span>
                          ) : (
                            <span className="text-state-success font-semibold flex items-center gap-1.5">
                              <span>🚚</span> {t('farmer.field_status_assigned', 'Buyer matched! Trolley being scheduled.')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {isUnsold && (
                            <button
                              type="button"
                              onClick={() => handleQuickCharityList(listing.id)}
                              className="px-3.5 py-2 bg-state-error text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-xs cursor-pointer flex items-center gap-1.5"
                              title="List on Charity Crowdfunding so normal citizens can pay for balers to clear your field"
                            >
                              <span>🌾</span>
                              <span>{t('farmer.free_clearance_btn', 'Need Free Field Clearance?')}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setActiveListing(listing.id); setView('assistance') }}
                            className="px-3.5 py-2 bg-surface border border-surface-border text-copy-primary rounded-xl text-xs font-semibold hover:bg-bg-subtle cursor-pointer flex items-center gap-1.5"
                          >
                            <span>💬</span>
                            <span>{t('farmer.need_help_btn', 'Need Help?')}</span>
                          </button>
                          {!isCompleted && !isPooled && (
                            <button
                              type="button"
                              onClick={() => handleDeleteListing(listing.id)}
                              className="px-3 py-2 bg-surface border border-surface-border text-copy-muted hover:text-state-error hover:border-state-error/40 rounded-xl text-xs font-semibold hover:bg-state-error-dim cursor-pointer flex items-center gap-1 transition-colors"
                              title={t('farmer.cancel_listing', 'Cancel / Delete this listing')}
                            >
                              <span>🗑️</span>
                              <span>{t('farmer.cancel_listing', 'Cancel')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Section 2: Verified Matching Offers & Confirmed Deals */}
          <div id="offers-section" className="space-y-6 scroll-mt-6">
            {/* Active Confirmed Deals with Buyer Chat */}
            {matchedDeals.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-copy-primary flex items-center gap-2">
                      <span>🤝</span>
                      <span>{t('farmer.active_deals_title', 'Active Confirmed Deals & Buyer Direct Chat')}</span>
                    </h3>
                    <p className="text-xs text-copy-secondary">
                      {t('farmer.active_deals_desc', 'Direct live chat with industrial buyers, coordinate tractor-baler arrival, and track payouts.')}
                    </p>
                  </div>
                  <span className="text-xs bg-state-success-dim text-state-success px-2.5 py-0.5 rounded-full font-bold">
                    {matchedDeals.length} {t('farmer.confirmed_deals', 'Deals Active')}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {matchedDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      userRole="farmer"
                      onOpenChat={(id) => setSelectedChatOfferId(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold text-copy-primary flex items-center gap-2">
                    <span>🤝</span> {t('farmer.matched_offers_title', 'Buyer Offers For You')}
                  </h3>
                  <p className="text-xs text-copy-secondary mt-0.5">
                    {t('farmer.matched_offers_desc', 'Verified factories and balers ready to buy your straw at fixed prices.')}
                  </p>
                </div>
                {offers.length > 0 && (
                  <span className="text-xs px-3 py-1 rounded-full font-bold bg-state-success-dim text-state-success border border-state-success/30 self-start sm:self-auto">
                    {offers.length} {t('matching.verified_offer', 'Offers')}
                  </span>
                )}
              </div>

              {offers.length === 0 ? (
                <div className="bg-surface border-2 border-dashed border-surface-border rounded-3xl p-8 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-accent-primary/10 text-accent-primary flex items-center justify-center text-3xl mx-auto">
                    🤝
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-lg font-bold text-copy-primary">
                      {t('farmer.no_offers_title', 'Looking for the best buyer offers')}
                    </h4>
                    <p className="text-xs text-copy-secondary leading-relaxed">
                      {t('farmer.no_offers_desc', 'As soon as a verified factory or baler matches your location and harvest date, their offer will appear here.')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {offers.map(offer => (
                    <OfferCard 
                      key={offer.id} 
                      offer={offer} 
                      onAccept={async (id) => {
                        await handleOfferAction(id, 'accept')
                        reloadData()
                        setSelectedChatOfferId(id)
                      }}
                      onDecline={async (id) => {
                        await handleOfferAction(id, 'decline')
                        reloadData()
                      }}
                      onOpenChat={(id) => setSelectedChatOfferId(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Registered Plots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-copy-primary">{t('farmer.plots_title', 'Your Registered Plots')}</h3>
                <p className="text-xs text-copy-secondary">
                  {t('farmer.plots_desc', 'Your registered agricultural land plots and acreage for paddy straw listing.')}
                </p>
              </div>
            </div>

            {plots.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">{t('farmer.no_plots_registered')}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {plots.map((plot, idx) => {
                  const sortedVerifs = plot.verifications && plot.verifications.length > 0
                    ? [...plot.verifications].sort(
                        (a, b) =>
                          new Date(b.checked_at || b.created_at || 0).getTime() -
                          new Date(a.checked_at || a.created_at || 0).getTime()
                      )
                    : []
                  const latestVerif = sortedVerifs[0]
                  const linkedListing = listings.find((l) => l.plot_id === plot.id)

                  return (
                    <div key={plot.id} className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3.5 shadow-xs flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🌾</span>
                              <h4 className="font-semibold text-copy-primary text-base">{t('farmer.plot_num')}{idx + 1}</h4>
                            </div>
                            <p className="text-xs text-copy-secondary mt-0.5">
                              {plot.acres} {t('farmer.acres_registered')}
                            </p>
                          </div>
                          <span className="text-[11px] font-mono text-copy-muted bg-bg-subtle px-2 py-0.5 rounded border border-surface-border-subtle">
                            GPS: {plot.centre?.coordinates ? `${plot.centre.coordinates[1]?.toFixed(3)}°N, ${plot.centre.coordinates[0]?.toFixed(3)}°E` : (i18n.language === 'hi' ? 'स्वतः प्राप्त' : i18n.language === 'pa' ? 'ਸਵੈ-ਪ੍ਰਾਪਤ' : 'Auto-detected')}
                          </span>
                        </div>

                        {/* Verification Status Pill */}
                        <div className="pt-1">
                          {latestVerif ? (
                            latestVerif.status === 'verified' ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-state-success-dim text-state-success border border-state-success/30">
                                <span>{t('farmer.verif_clean', '✓ Verified Clean Field (Zero Burn)')}</span>
                              </div>
                            ) : latestVerif.status === 'fire_detected' ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-state-error-dim text-state-error border border-state-error/30">
                                <span>{t('farmer.verif_fire', '🔥 Fire Detected')}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-state-warning-dim text-state-warning border border-state-warning/30">
                                <span>{t('farmer.verif_cloudy', '⏳ Inconclusive (Cloud Obscured)')}</span>
                              </div>
                            )
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-bg-subtle text-copy-secondary border border-surface-border-subtle">
                              <span>🌱 {t('farmer.verif_pending', 'Automated check runs post-pickup')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Listing Action / Status */}
                      <div className="pt-2 border-t border-surface-border-subtle flex items-center justify-between">
                        {linkedListing ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-copy-secondary">
                              {t('farmer.listing_active', { status: t(`status.${linkedListing.status}`, linkedListing.status) })}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brand-dim text-brand border border-brand/20">
                              {t(`status.${linkedListing.status}`, linkedListing.status)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-copy-secondary">
                              {t('farmer.plot_ready_to_list', 'Ready to list paddy straw')}
                            </span>
                            <button
                              onClick={() => {
                                if (!isVerified) {
                                  setActionMsg(i18n.language === 'hi' ? '⚠️ सत्यापित पहचान आवश्यक! लिस्टिंग बनाने से पहले कृपया ऊपर अपना पहचान प्रमाण जमा करें।' : i18n.language === 'pa' ? '⚠️ ਤਸਦੀਕਸ਼ੁਦਾ ਪਛਾਣ ਲੋੜੀਂਦੀ ਹੈ! ਕਿਰਪਾ ਕਰਕੇ ਲਿਸਟਿੰਗ ਬਣਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਆਪਣੀ ਪਛਾਣ ਦਾ ਸਬੂਤ ਜਮ੍ਹਾਂ ਕਰੋ।' : '⚠️ Verified ID required! Please submit and verify your ID proof before creating a listing.')
                                  return
                                }
                                setView('listing')
                              }}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-brand text-on-brand hover:bg-accent-secondary transition-colors"
                            >
                              {t('farmer.list_straw_btn', '+ List Straw')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Section 4: Pickups & Instant Payments */}
          <div id="pickups-section" className="space-y-4 scroll-mt-6">
            <h3 className="text-lg font-medium text-copy-primary">{t('farmer.pickups_title')}</h3>
            {pickups.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">{t('farmer.no_pickups')}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {pickups.map(pickup => (
                  <PickupCard 
                    key={pickup.id} 
                    pickup={pickup}
                    mode="farmer"
                    onUpdatePayment={async (id, data) => {
                      await updatePickupPayment(id, data)
                      getPickups().then(setPickups)
                    }} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 5: WhatsApp Two-Way Interactive Sandbox & Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-copy-primary">{t('farmer.whatsapp_channel')}</h3>
                <p className="text-xs text-copy-secondary">
                  {t('farmer.whatsapp_channel_desc')}
                </p>
              </div>
            </div>

            <WhatsappSimulator 
              userPhone={farmerProfile?.phone || '+919999900001'}
              onMessageSent={reloadData}
            />

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-copy-secondary">{t('farmer.timeline')}</h4>
              {messages.length === 0 ? (
                <div className="bg-surface border border-surface-border rounded-2xl p-5 text-center">
                  <p className="text-copy-secondary text-sm">{t('farmer.no_messages')}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-2xl max-w-sm sm:max-w-md shadow-xs ${
                        msg.direction === 'inbound'
                          ? 'bg-surface border border-surface-border mr-auto'
                          : 'bg-brand text-on-brand ml-auto font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                          {msg.direction === 'inbound' ? t('farmer.farmer_via_whatsapp') : t('farmer.bot_name')}
                        </span>
                        <span className="text-[10px] opacity-70">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{msg.raw_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Profile & Land Plot Settings (Collapsible) */}
          <div className="pt-2">
            <FarmerSetup />
          </div>
        </div>
      )}

      {selectedChatOfferId && (
        <DealChatModal
          offerId={selectedChatOfferId}
          initialDeal={matchedDeals.find((d) => d.offer_id === selectedChatOfferId || d.id === selectedChatOfferId)}
          currentUserRole="farmer"
          currentUserId={userId}
          currentUserName={farmerProfile?.name || 'Farmer'}
          onClose={() => setSelectedChatOfferId(null)}
        />
      )}
    </div>
  )
}

