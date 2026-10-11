import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { NewListingForm } from '@/features/listing/components/NewListingForm'
import { createListing, getPlots, getListings } from '@/features/listing/api'
import { getOffers, handleOfferAction, getPools } from '@/features/matching/api'
import { OfferCard } from '@/features/matching/components/OfferCard'
import { PoolProgress } from '@/features/matching/components/PoolProgress'
import { getPickups, updatePickupPayment } from '@/features/pickup/api'
import { PickupCard } from '@/features/pickup/components/PickupCard'
import { VerificationCard } from '@/features/verification/components/VerificationCard'
import { triggerVerification } from '@/features/verification/api'
import { getNotifications, requestAssistance } from '@/features/charity/api'
import { getMessages } from '@/features/whatsapp/api'
import { WhatsappSimulator } from '@/features/whatsapp/components/WhatsappSimulator'
import { AssistanceRequestForm } from '@/features/charity/components/AssistanceRequestForm'
import { getFarmerProfile } from '@/features/farmer/api'

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
  const [pools, setPools] = useState<PoolData[]>([])
  const [pickups, setPickups] = useState<
    { id: string; pool_id: string; actual_tonnes: number | null; amount_due: number | null; payment_status: string; quality_notes?: string | null; pools: { pickup_date: string | null } }[]
  >([])
  const [messages, setMessages] = useState<{ id: string; direction: string; raw_text: string; created_at: string }[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [verifyingPlotId, setVerifyingPlotId] = useState<string | null>(null)

  const reloadData = useCallback(() => {
    getOffers().then((data) => setOffers((data as unknown as typeof offers) || [])).catch(console.error)
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

  const handleQuickCharityList = async (listingId: string) => {
    try {
      await requestAssistance({ listing_id: listingId, purpose: 'Urgent citizen crowdfunding clearance to avoid burning' })
      setActionMsg(i18n.language === 'hi' ? '🌾 पराली सफलतापूर्वक नागरिक चैरिटी पोर्टल पर जोड़ दी गई!' : '🌾 Stubble successfully listed on the Citizen Charity Crowdfunding Portal!')
      reloadData()
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to list on charity portal')
    }
  }

  const handleRunSatelliteCheck = async (
    plotId: string,
    scenario: 'verified' | 'fire_detected' | 'inconclusive' | 'real'
  ) => {
    setVerifyingPlotId(plotId)
    try {
      await triggerVerification(plotId, scenario)
      await queryClient.invalidateQueries({ queryKey: ['plots', userId] })
      reloadData()
      setActionMsg(i18n.language === 'hi' ? `🛰️ सैटेलाइट जाँच पूरी हुई (${scenario})! परिणाम नीचे देखें।` : `🛰️ Satellite check completed (scenario: ${scenario})! Check results below.`)
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to trigger satellite check')
    } finally {
      setVerifyingPlotId(null)
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

      {/* Sync Status & Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {view === 'dashboard' && (
            <div className="relative group">
              <button
                onClick={() => {
                  if (!isVerified) {
                    setActionMsg(i18n.language === 'hi' ? '⚠️ सत्यापित पहचान आवश्यक! लिस्टिंग बनाने से पहले कृपया ऊपर अपना पहचान प्रमाण जमा करें।' : '⚠️ Verified ID required! Please submit and verify your ID proof before creating a listing.')
                    return
                  }
                  setView('listing')
                }}
                className={`px-4 py-2 rounded-xl font-medium shadow-xs transition-all ${
                  isVerified
                    ? 'bg-brand text-on-brand hover:bg-accent-secondary'
                    : 'bg-bg-subtle text-copy-muted border border-surface-border cursor-not-allowed opacity-80'
                }`}
              >
                {t('farmer.new_listing')}
              </button>
              {!isVerified && (
                <span className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block w-56 p-2 bg-surface text-copy-primary text-xs rounded-xl shadow-lg border border-surface-border z-20">
                  {i18n.language === 'hi' ? 'लिस्टिंग बनाने के लिए सत्यापित पहचान आवश्यक है।' : 'Verified ID required to create listings.'}
                </span>
              )}
            </div>
          )}
          {view !== 'dashboard' && (
            <button
              onClick={() => setView('dashboard')}
              className="px-4 py-2 bg-surface border border-surface-border rounded-xl font-medium text-copy-primary hover:bg-bg-subtle"
            >
              {t('common.back')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-copy-secondary bg-surface border border-surface-border px-3 py-1.5 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
          <span className="font-medium text-copy-primary">{t('farmer.live_sync')}</span>
          <span>•</span>
          <span className="font-mono font-medium text-state-success">🔒 {t('farmer.e2e_encrypted')}</span>
        </div>
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

      {view === 'listing' && (
        plots.length === 0 ? (
          <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center space-y-3">
            <h4 className="text-lg font-medium text-copy-primary">{i18n.language === 'hi' ? 'कोई खेत पंजीकृत नहीं है' : 'No plots registered'}</h4>
            <p className="text-copy-secondary text-sm">{i18n.language === 'hi' ? 'लिस्टिंग बनाने से पहले कृपया ऊपर "आपके खेत" अनुभाग में कम से कम एक खेत जोड़ें।' : 'Please register at least one plot in the "Your Plots" section before creating a listing.'}</p>
            <button onClick={() => setView('dashboard')} className="px-4 py-2 bg-brand text-on-brand rounded-xl text-sm font-medium">{i18n.language === 'hi' ? 'डैशबोर्ड पर वापस' : 'Back to Dashboard'}</button>
          </div>
        ) : (
          <NewListingForm 
            plots={plots.map((p, idx) => ({ id: p.id, name: `${t('farmer.plot_num')}${idx + 1}`, acres: p.acres }))}
            onSubmit={async (data) => {
              await createListing(data)
              await queryClient.invalidateQueries({ queryKey: ['heatmap'] })
              reloadData()
              setView('dashboard')
            }} 
            onCancel={() => setView('dashboard')} 
          />
        )
      )}

      {view === 'assistance' && activeListing && (
        <AssistanceRequestForm 
          listingId={activeListing}
          onSubmit={() => { reloadData(); setView('dashboard') }}
          onCancel={() => setView('dashboard')}
        />
      )}

      {view === 'dashboard' && (
        <div className="space-y-8">
          {/* Section 1: Listings & Pooling */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-copy-primary">{t('farmer.listings_title')}</h3>
            <div className="grid gap-4">
              {listings.length === 0 ? (
                <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                  <p className="text-copy-secondary text-sm">
                    {t('farmer.no_listings')}
                  </p>
                </div>
              ) : (
                listings.map((listing) => {
                  const acresDisplay = listing.acres ?? listing.plots?.acres ?? (listing.est_tonnes ? (listing.est_tonnes / 2.5).toFixed(1) : '?')
                  const isUnsold = listing.status === 'open'
                  const isMatched = listing.status === 'matched'
                  const isPooled = listing.status === 'pooled'
                  const isCompleted = listing.status === 'completed'
                  const linkedPool = listing.pool_id ? pools.find((p) => p.id === listing.pool_id) : null

                  return (
                    <div key={listing.id} className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <p className="font-semibold text-copy-primary">
                              {acresDisplay} {t('listing.acres', 'एकड़')} • {listing.est_tonnes ? `${listing.est_tonnes.toFixed(1)} ${t('listing.tonnes', 'टन')}` : ''}
                            </p>
                            <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${
                              isMatched || isPooled ? 'bg-state-success-dim text-state-success' :
                              isCompleted ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {t(`status.${listing.status}`, isUnsold ? (i18n.language === 'hi' ? 'बिक्री के लिए उपलब्ध' : 'Unsold (In Marketplace)') : listing.status)}
                            </span>
                            {listing.source === 'whatsapp' && (
                              <span className="px-2 py-0.5 bg-bg-subtle text-copy-secondary text-xs rounded-full flex items-center gap-1 border border-surface-border">
                                {t('farmer.via_whatsapp')}
                              </span>
                            )}
                            {isUnsold && (
                              <span className="px-2 py-0.5 bg-state-error-dim text-state-error text-xs rounded-full font-medium">
                                {t('farmer.burning_risk')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-copy-secondary mt-1">{t('farmer.expected_harvest')} {listing.harvest_date}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isUnsold && (
                            <button
                              type="button"
                              onClick={() => handleQuickCharityList(listing.id)}
                              className="px-3 py-1.5 bg-state-error text-white rounded-lg text-xs font-semibold hover:opacity-90 shadow-xs"
                              title="List on Charity Crowdfunding so normal citizens can pay for balers to clear your field"
                            >
                              {t('farmer.list_charity')}
                            </button>
                          )}
                          <button
                            onClick={() => { setActiveListing(listing.id); setView('assistance') }}
                            className="px-3 py-1.5 bg-surface border border-surface-border text-copy-primary rounded-lg text-xs font-medium hover:bg-bg-subtle"
                          >
                            {t('farmer.custom_assistance')}
                          </button>
                        </div>
                      </div>

                      {/* Stubble Condition, Form, Quality & Fair Pricing */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-surface-border-subtle text-xs">
                        <div className="bg-bg-subtle/50 p-2.5 rounded-xl border border-surface-border/40">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-copy-muted block">
                            {t('farmer.stubble_form_delivery')}
                          </span>
                          <strong className="text-copy-primary text-xs mt-0.5 block truncate">
                            {getStubbleFormDisplay(listing.stubble_form_name, listing.combine_sms_used, i18n.language)}
                          </strong>
                          <span className="text-[11px] text-brand font-medium">
                            {getPriceRangeDisplay(listing.market_price_range, listing.combine_sms_used, i18n.language)}
                          </span>
                        </div>

                        <div className="bg-bg-subtle/50 p-2.5 rounded-xl border border-surface-border/40">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-copy-muted block">
                            {t('farmer.quality_moisture')}
                          </span>
                          <strong className="text-copy-primary text-xs mt-0.5 block truncate">
                            {getQualityGradeDisplay(listing.quality_grade, listing.combine_sms_used, i18n.language)}
                          </strong>
                          <span className="text-[11px] text-copy-secondary">
                            {i18n.language === 'hi' ? 'नमी: ' : i18n.language === 'pa' ? 'ਨਮੀ: ' : 'Moisture: '}{listing.moisture_level || (listing.combine_sms_used ? '12-15%' : '15-20%')}
                          </span>
                        </div>

                        <div className="bg-bg-subtle/50 p-2.5 rounded-xl border border-surface-border/40">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-copy-muted block">
                            {t('farmer.market_benchmark')}
                          </span>
                          <strong className="text-state-success text-xs mt-0.5 block">
                            ₹{(listing.price_per_tonne || (listing.combine_sms_used ? 1850 : 600)).toLocaleString()}/{t('listing.tonnes', 'टन')}
                          </strong>
                          <span className="text-[11px] text-copy-secondary">
                            {t('farmer.est_payout')} ₹{Math.round(listing.total_price || (listing.est_tonnes || 0) * (listing.price_per_tonne || 600)).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Suitable Purposes */}
                      {listing.intended_purposes && listing.intended_purposes.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1">
                          <span className="text-copy-muted font-medium">{t('farmer.target_industries')}</span>
                          {listing.intended_purposes.map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded-md bg-brand/10 text-brand font-medium">
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
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Section 2: Verified Matching Offers */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-copy-primary">{t('farmer.matched_offers_title')}</h3>
            {offers.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-copy-secondary text-sm">{t('farmer.no_offers')}</p>
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
                    }}
                    onDecline={async (id) => {
                      await handleOfferAction(id, 'decline')
                      reloadData()
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Registered Plots & Satellite Verification */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-copy-primary">{t('farmer.plots_verif_title')}</h3>
                <p className="text-xs text-copy-secondary">
                  {t('farmer.plots_verif_desc')}
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

                  return (
                    <div key={plot.id} className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-copy-primary text-base">{t('farmer.plot_num')}{idx + 1}</h4>
                          <p className="text-xs text-copy-secondary mt-0.5">{plot.acres} {t('farmer.acres_registered')}</p>
                        </div>
                        <span className="text-[11px] font-mono text-copy-muted bg-bg-subtle px-2 py-0.5 rounded border border-surface-border-subtle">
                          GPS: {plot.centre?.coordinates ? `${plot.centre.coordinates[1]?.toFixed(3)}°N, ${plot.centre.coordinates[0]?.toFixed(3)}°E` : (i18n.language === 'hi' ? 'स्वतः प्राप्त' : i18n.language === 'pa' ? 'ਸਵੈ-ਪ੍ਰਾਪਤ' : 'Auto-detected')}
                        </span>
                      </div>

                      <VerificationCard
                        verification={latestVerif}
                        plot={plot}
                        onTriggerCheck={(scenario) => handleRunSatelliteCheck(plot.id, scenario)}
                        isTriggering={verifyingPlotId === plot.id}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Section 4: Pickups & Instant Payments */}
          <div className="space-y-4">
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
        </div>
      )}
    </div>
  )
}

