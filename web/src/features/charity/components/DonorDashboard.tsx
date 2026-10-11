import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getDonorHistory,
  getNGOs,
  createDonation,
  getRankedVillages,
  getNotifications,
  getCrowdfundingCampaigns,
  createStripeCheckoutSession,
  confirmStripePayment,
  syncUnsoldListings,
  callNgoForCampaign,
} from '../api'

interface CrowdfundingCampaign {
  id: string
  listing_id?: string
  farmer_id?: string
  farmer_name?: string
  farmer_phone?: string
  village_name?: string
  district?: string
  target_village_id?: string
  ngo_id: string
  ngo_name?: string
  acres?: number
  est_tonnes?: number
  amount_requested: number
  amount_funded?: number
  percent_funded?: number
  co2_prevented_tonnes?: number
  pm25_prevented_kg?: number
  fire_risk?: string
  burn_countdown?: string
  days_unsold?: number
  purpose: string
  status: string
  created_at: string
  farmers?: { profiles?: { name: string } }
  ngos?: { profiles?: { name: string } }
  listings?: {
    id: string
    est_tonnes?: number
    plots?: { acres?: number; village_id?: string; villages?: { name: string } }
  }
}

interface NgoDispatchDetails {
  ngo_name: string
  ngo_phone: string
  mission_status: string
  machinery_assigned: string
  estimated_arrival: string
  co2_saved_tonnes: number
  pm25_saved_kg: number
  action: string
}

export function DonorDashboard({ userId = '', isPublicView = false }: { userId?: string; isPublicView?: boolean }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'rescues' | 'simulator' | 'wind' | 'honours'>('rescues')
  const [history, setHistory] = useState<
    { id: string; amount: number; created_at: string; ngos?: { profiles?: { name: string } } }[]
  >([])
  const [ngos, setNgos] = useState<{ profile_id: string; profiles?: { name: string } }[]>([])
  const [ranked, setRanked] = useState<{ influence_score: number; label: string; village?: { name: string }; distance_km?: number }[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])
  const [campaigns, setCampaigns] = useState<CrowdfundingCampaign[]>([])
  const [donationMsg, setDonationMsg] = useState<string | null>(null)
  const [activeModalCampaign, setActiveModalCampaign] = useState<CrowdfundingCampaign | null>(null)
  const [donationAmount, setDonationAmount] = useState<number>(1300)
  const [isProcessingStripe, setIsProcessingStripe] = useState<boolean>(false)
  const [stripeStepMsg, setStripeStepMsg] = useState<string>('')
  const [dispatchedMission, setDispatchedMission] = useState<NgoDispatchDetails | null>(null)
  const [directAmount, setDirectAmount] = useState<number>(1300)
  const [selectedCity, setSelectedCity] = useState<string>('Delhi')
  const [paymentMode, setPaymentMode] = useState<'dummy' | 'hosted'>('dummy')
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [callingCampaignId, setCallingCampaignId] = useState<string | null>(null)
  
  // Interactive Simulator State
  const [simAmount, setSimAmount] = useState<number>(1300)
  const [certCopied, setCertCopied] = useState<boolean>(false)

  const effectiveUserId = userId || '3e661c35-1c37-45fd-8143-72a68beca858'

  const loadData = useCallback(async (city: string = selectedCity) => {
    try {
      const [h, n, r, notifs, camps] = await Promise.all([
        userId ? getDonorHistory(userId).catch(() => []) : Promise.resolve([]),
        getNGOs().catch(() => []),
        getRankedVillages(city).catch(() => []),
        userId ? getNotifications(userId).catch(() => []) : Promise.resolve([]),
        getCrowdfundingCampaigns().catch(() => []),
      ])
      setHistory(h || [])
      setNgos(n || [])
      setRanked(r || [])
      setNotifications(notifs || [])
      setCampaigns((camps || []) as unknown as CrowdfundingCampaign[])
    } catch (err) {
      console.error('Error loading donor data:', err)
    }
  }, [userId, selectedCity])

  const handleSyncUnsold = async () => {
    setIsSyncing(true)
    try {
      const res = await syncUnsoldListings({ days_threshold: 2, force_demo: true })
      setDonationMsg(`🌾 Database Sync Complete! Verified ${res.count} unsold stubble plots ready for crowdfunding rescue.`)
      await loadData()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleManualNgoCall = async (campaignId: string) => {
    setCallingCampaignId(campaignId)
    try {
      const res = await callNgoForCampaign(campaignId)
      setDispatchedMission(res.data)
      setDonationMsg(`🚜 Automated call placed to ${res.data.ngo_name}! Baler machinery dispatched within 24 hours.`)
      await loadData()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to call NGO')
    } finally {
      setCallingCampaignId(null)
    }
  }

  // Check URL parameters for returning Stripe sessions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripeStatus = params.get('stripe_status')
    const sessionId = params.get('session_id')
    const campaignId = params.get('campaign_id')
    const amt = Number(params.get('amount') || 1300)

    if (stripeStatus === 'success' && campaignId) {
      confirmStripePayment({
        campaign_id: campaignId,
        amount: amt,
        session_id: sessionId || undefined,
        donor_id: effectiveUserId,
      })
        .then((res) => {
          setDonationMsg(`🎉 Stripe payment verified! Contributed ₹${amt.toLocaleString()} to rescue field from fire.`)
          if (res.ngo_dispatch) {
            setDispatchedMission(res.ngo_dispatch)
          }
          loadData()
          window.history.replaceState({}, document.title, window.location.pathname)
        })
        .catch((err) => {
          console.error('Error confirming return session:', err)
        })
    }
  }, [effectiveUserId, loadData])

  useEffect(() => {
    loadData(selectedCity)
  }, [loadData, selectedCity])

  const handleGeneralDonate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    try {
      await createDonation({
        ngo_id: form.ngo_id.value,
        amount: Number(form.amount.value),
      })
      form.reset()
      setDonationMsg('Thank you! Your general donation was received and will fund tractor baling operations.')
      loadData()
    } catch (err: unknown) {
      setDonationMsg(err instanceof Error ? err.message : 'Donation failed')
    }
  }

  // Handle Stripe Donation submission
  const handleStripeDonate = async () => {
    if (!activeModalCampaign) return
    setIsProcessingStripe(true)

    try {
      if (paymentMode === 'hosted') {
        setStripeStepMsg('Creating Stripe Checkout session...')
        const session = await createStripeCheckoutSession({
          campaign_id: activeModalCampaign.id,
          amount: donationAmount,
          currency: 'inr',
          return_url: window.location.origin + window.location.pathname,
        })
        if (session.checkout_url) {
          window.location.href = session.checkout_url
          return
        }
      }

      setStripeStepMsg('Authorizing ₹' + donationAmount.toLocaleString() + ' with Stripe Sandbox...')
      await new Promise((r) => setTimeout(r, 400))
      setStripeStepMsg('Payment authorized! Automatically calling nearby NGO & dispatching balers...')
      const res = await confirmStripePayment({
        campaign_id: activeModalCampaign.id,
        amount: donationAmount,
        session_id: `cs_test_dummy_${Date.now()}`,
        donor_id: effectiveUserId,
        is_test_dummy: true,
      })

      setDonationMsg(
        `🎉 Impact Achieved! ₹${donationAmount.toLocaleString()} contributed to rescue ${activeModalCampaign.farmer_name || 'Farmer'}'s field from burning!`
      )

      if (res.ngo_dispatch) {
        setDispatchedMission(res.ngo_dispatch)
      }

      setActiveModalCampaign(null)
      loadData()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Stripe payment failed')
    } finally {
      setIsProcessingStripe(false)
    }
  }

  // Aggregate metrics
  const totalAcresAtRisk = useMemo(() => campaigns.reduce((acc, c) => acc + (c.acres || 8), 0), [campaigns])
  const totalTonnesAtRisk = useMemo(() => campaigns.reduce((acc, c) => acc + (c.est_tonnes || 20), 0), [campaigns])
  const totalCo2Prevented = useMemo(() => campaigns.reduce((acc, c) => acc + (c.co2_prevented_tonnes || 30), 0), [campaigns])
  const totalPm25Prevented = useMemo(() => Math.round(totalTonnesAtRisk * 34), [totalTonnesAtRisk])

  // Simulator Computed Values
  const simAcres = useMemo(() => +(simAmount / 1300).toFixed(2), [simAmount])
  const simStrawTonnes = useMemo(() => +(simAcres * 2.5).toFixed(1), [simAcres])
  const simCo2 = useMemo(() => +(simStrawTonnes * 1.45).toFixed(1), [simStrawTonnes])
  const simPm25 = useMemo(() => Math.round(simStrawTonnes * 34), [simStrawTonnes])
  const simPeopleShielded = useMemo(() => Math.round(simAcres * 175), [simAcres])
  const simCleanAirHours = useMemo(() => Math.round(simAcres * 720), [simAcres])

  // Donor Personal Metrics
  const totalDonated = useMemo(() => history.reduce((sum, h) => sum + h.amount, 0), [history])
  const totalPersonalAcres = useMemo(() => +(totalDonated / 1300).toFixed(1), [totalDonated])
  const totalPersonalStraw = useMemo(() => +(totalPersonalAcres * 2.5).toFixed(1), [totalPersonalAcres])
  const totalPersonalCo2 = useMemo(() => +(totalPersonalStraw * 1.45).toFixed(1), [totalPersonalStraw])

  const copyShareText = () => {
    const text = `🍃 I am funding stubble clearance with ResidueLoop to stop farm fires in Punjab! My contribution helped clear ${totalPersonalAcres > 0 ? totalPersonalAcres : 1} acre(s) of farmland and prevented toxic PM2.5 smoke from reaching northern skies. Join the movement: ${window.location.origin}/charity`
    navigator.clipboard.writeText(text).then(() => {
      setCertCopied(true)
      setTimeout(() => setCertCopied(false), 3000)
    })
  }

  // Quick Action Preset Opener
  const openFirstCampaignWithAmount = (amount: number) => {
    const target = campaigns.find((c) => c.status !== 'approved') || campaigns[0]
    if (target) {
      setActiveModalCampaign(target)
      setDonationAmount(amount)
    } else {
      setActiveTab('simulator')
      setSimAmount(amount)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {donationMsg && (
        <div className="rounded-2xl bg-state-success-dim border border-state-success/30 p-4 text-sm text-state-success flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌿</span>
            <p className="font-semibold">{donationMsg}</p>
          </div>
          <button
            onClick={() => setDonationMsg(null)}
            className="text-xs uppercase font-bold opacity-75 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================= HERO ATMOSPHERE & REAL-TIME IMPACT METER ================= */}
      <div className="relative overflow-hidden rounded-3xl bg-surface border-2 border-brand/20 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-bold">
              <span>🍃</span>
              <span>{t('donor.hero_badge', 'Citizen Clean Air Rescue Initiative')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-copy-primary tracking-tight">
              {t('donor.hero_title', 'Every Rupee Clears the Sky')}
            </h2>
            <p className="text-xs sm:text-sm text-copy-secondary leading-relaxed">
              {t(
                'donor.hero_desc',
                'Smallholder farmers face strict 14-day deadlines to sow winter wheat. When industrial buyers take too long, farmers are forced to burn. By funding machine balers at just ₹1,300 per acre, you stop the fire, protect farmer families, and eliminate toxic smog at the source.'
              )}
            </p>
          </div>

          {/* Machine Cost Trust Banner */}
          <div className="bg-bg-subtle border border-surface-border p-4 rounded-2xl flex flex-col justify-between space-y-2 lg:w-72 shrink-0">
            <div className="flex items-center justify-between text-xs text-copy-secondary">
              <span className="font-semibold">Baler Clearance Cost</span>
              <span className="text-[10px] bg-state-success-dim text-state-success px-2 py-0.5 rounded-full font-bold">100% Zero-Burn</span>
            </div>
            <div className="text-2xl font-black text-brand">₹1,300 <span className="text-xs font-semibold text-copy-secondary">/ acre</span></div>
            <p className="text-[11px] text-copy-muted leading-tight">
              {t('donor.rate_guarantee_note', '₹1,300 funds 1 full acre of tractor baling with zero burning.')}
            </p>
          </div>
        </div>

        {/* 4 Live Environmental Impact Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-surface-border">
          <div className="bg-bg-subtle/80 rounded-2xl p-3.5 border border-surface-border">
            <p className="text-[11px] font-medium text-copy-secondary">{t('donor.stat_acres_risk', 'Farmland At Burn Risk')}</p>
            <p className="text-xl font-black text-copy-primary mt-0.5">{totalAcresAtRisk.toFixed(1)} <span className="text-xs font-bold text-copy-muted">Acres</span></p>
            <p className="text-[10px] text-copy-muted mt-0.5">~{totalTonnesAtRisk.toFixed(0)}t paddy straw</p>
          </div>
          <div className="bg-bg-subtle/80 rounded-2xl p-3.5 border border-surface-border">
            <p className="text-[11px] font-medium text-copy-secondary">{t('donor.stat_pm25_prevented', 'Toxic PM2.5 Prevented')}</p>
            <p className="text-xl font-black text-state-error mt-0.5">{totalPm25Prevented.toLocaleString()} <span className="text-xs font-bold text-copy-muted">Kg</span></p>
            <p className="text-[10px] text-copy-muted mt-0.5">Toxic lung particulate</p>
          </div>
          <div className="bg-bg-subtle/80 rounded-2xl p-3.5 border border-surface-border">
            <p className="text-[11px] font-medium text-copy-secondary">{t('donor.stat_co2_prevented', 'Potential CO2 Averted')}</p>
            <p className="text-xl font-black text-state-success mt-0.5">{totalCo2Prevented.toFixed(0)} <span className="text-xs font-bold text-copy-muted">MT CO2</span></p>
            <p className="text-[10px] text-copy-muted mt-0.5">Equals 120 cars off roads</p>
          </div>
          <div className="bg-bg-subtle/80 rounded-2xl p-3.5 border border-surface-border">
            <p className="text-[11px] font-medium text-copy-secondary">Baler Deployment Speed</p>
            <p className="text-xl font-black text-brand mt-0.5">&lt; 24 <span className="text-xs font-bold text-copy-muted">Hours</span></p>
            <p className="text-[10px] text-state-success font-medium mt-0.5">Automated NGO dispatch</p>
          </div>
        </div>

        {/* Quick One-Tap Rescue Presets Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <span className="text-xs font-bold text-copy-primary flex items-center gap-1.5">
            <span>⚡</span> Quick Impact Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { amt: 500, label: t('donor.sim_preset_1', '₹500 (0.4 Acre)') },
              { amt: 1300, label: t('donor.sim_preset_2', '₹1,300 (1 Full Acre)') },
              { amt: 2600, label: t('donor.sim_preset_3', '₹2,600 (2 Full Acres)') },
              { amt: 6500, label: t('donor.sim_preset_4', '₹6,500 (5 Acres Rescue)') },
            ].map((p) => (
              <button
                key={p.amt}
                type="button"
                onClick={() => openFirstCampaignWithAmount(p.amt)}
                className="px-3 py-1.5 bg-surface border border-brand/30 hover:border-brand hover:bg-brand/5 text-copy-primary rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span>🛡️</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dispatched NGO Mission Banner (When Machine Call or Payment Executes) */}
      {dispatchedMission && (
        <div className="rounded-3xl bg-state-success-dim/30 border-2 border-state-success/40 p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-state-success/15 text-state-success flex items-center justify-center text-2xl font-bold">
                🚜
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-state-success">
                  Machine Clearance Deployed Successfully
                </span>
                <h3 className="text-lg font-bold text-copy-primary">
                  Nearby NGO Dispatched: {dispatchedMission.ngo_name}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setDispatchedMission(null)}
              className="text-xs font-bold text-copy-muted hover:text-copy-primary px-2 py-1 cursor-pointer"
            >
              ✕ Dismiss
            </button>
          </div>

          <p className="text-xs sm:text-sm text-copy-secondary leading-relaxed">
            {dispatchedMission.action}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 bg-surface rounded-xl border border-surface-border">
              <span className="text-copy-muted block font-medium">Assigned Machinery:</span>
              <span className="font-semibold text-copy-primary">{dispatchedMission.machinery_assigned}</span>
            </div>
            <div className="p-3 bg-surface rounded-xl border border-surface-border">
              <span className="text-copy-muted block font-medium">Deployment Status:</span>
              <span className="font-semibold text-state-success">✓ Arrival {dispatchedMission.estimated_arrival}</span>
            </div>
            <div className="p-3 bg-surface rounded-xl border border-surface-border">
              <span className="text-copy-muted block font-medium">Farmer Reassurance:</span>
              <span className="font-semibold text-copy-primary">WhatsApp alert delivered</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= 4-TAB PORTAL NAVIGATION ================= */}
      <div className="flex border-b border-surface-border overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('rescues')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'rescues'
              ? 'border-brand text-brand'
              : 'border-transparent text-copy-secondary hover:text-copy-primary'
          }`}
        >
          <span>🌾</span>
          <span>{t('donor.tab_urgent_rescues', 'Urgent Field Rescues')}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-state-error-dim text-state-error font-bold">
            {campaigns.filter((c) => c.status !== 'approved').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'simulator'
              ? 'border-brand text-brand'
              : 'border-transparent text-copy-secondary hover:text-copy-primary'
          }`}
        >
          <span>🧮</span>
          <span>{t('donor.tab_simulator', 'Live Impact Simulator')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wind')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'wind'
              ? 'border-brand text-brand'
              : 'border-transparent text-copy-secondary hover:text-copy-primary'
          }`}
        >
          <span>🗺️</span>
          <span>{t('donor.tab_wind_shield', 'Downwind Air Shield')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('honours')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'honours'
              ? 'border-brand text-brand'
              : 'border-transparent text-copy-secondary hover:text-copy-primary'
          }`}
        >
          <span>🏅</span>
          <span>{t('donor.tab_my_honours', 'My Impact & Honours')}</span>
          {history.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-state-success-dim text-state-success font-bold">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* ================= TAB 1: URGENT FIELD RESCUES ================= */}
      {activeTab === 'rescues' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface border border-surface-border p-4 rounded-2xl shadow-xs">
            <div>
              <h3 className="text-lg font-bold text-copy-primary flex items-center gap-2">
                <span>🌾</span> {t('donor.portal_title', 'Anti-Stubble Burning Crowdfunding Portal')}
              </h3>
              <p className="text-xs text-copy-secondary mt-0.5">
                {t('donor.portal_sub', 'When stubble remains unsold in 2–3 days, farmers face pressure to burn. Crowdfund clearance costs so balers can clear their fields cleanly!')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncUnsold}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-bg-subtle hover:bg-surface-border text-copy-primary border border-surface-border transition-all disabled:opacity-50 shadow-xs cursor-pointer"
                title="Scan database for listings unsold by buyers for 2-3 days and list them on charity"
              >
                <span>{isSyncing ? '⏳ Syncing Database...' : '🔄 Sync Unsold Marketplace Plots'}</span>
              </button>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-2xl p-8 text-center space-y-3">
              <div className="text-4xl">🌾</div>
              <p className="font-bold text-copy-primary">{t('donor.no_fields_risk', 'No Fields At Immediate Burning Risk')}</p>
              <p className="text-xs text-copy-secondary max-w-md mx-auto">
                {t('donor.no_fields_desc', 'All listed stubble is currently matched with industrial buyers. Any unsold farmer stubble will appear here for public crowdfunding.')}
              </p>
              <button
                type="button"
                onClick={handleSyncUnsold}
                className="mt-2 text-xs font-semibold text-brand underline cursor-pointer"
              >
                Check &amp; Sync Unsold Stubble from Marketplace
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((camp) => {
                const acres = camp.acres ?? camp.listings?.plots?.acres ?? 8
                const tonnes = camp.est_tonnes ?? camp.listings?.est_tonnes ?? acres * 2.5
                const goal = camp.amount_requested || acres * 1300
                const funded = camp.amount_funded ?? 0
                const pct = Math.min(100, Math.round((funded / (goal || 1)) * 100))
                const farmerName = camp.farmer_name || camp.farmers?.profiles?.name || 'Local Farmer'
                const villageName = camp.village_name || camp.listings?.plots?.villages?.name || 'Ajitwal'
                const district = camp.district || 'Moga'
                const isCleared = camp.status === 'approved' || pct >= 100
                const daysUnsold = camp.days_unsold || 3
                const remaining = Math.max(0, goal - funded)

                return (
                  <div
                    key={camp.id}
                    className={`bg-surface border-2 rounded-3xl p-5 shadow-xs space-y-4 relative flex flex-col justify-between transition-all hover:shadow-md ${
                      isCleared
                        ? 'border-state-success/40 bg-state-success-dim/10'
                        : 'border-surface-border hover:border-brand/50'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          {isCleared ? (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-state-success-dim text-state-success font-bold border border-state-success/30 inline-flex items-center gap-1">
                              <span>✓</span> {t('donor.balers_dispatched_badge', '🚜 Balers Dispatched • Protected')}
                            </span>
                          ) : (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-state-error-dim text-state-error font-bold border border-state-error/30 inline-flex items-center gap-1 animate-pulse">
                              <span>⏱️</span> {t('donor.burn_countdown_badge', '⏱️ 48h Fire Threat • Unsold {{days}} Days', { days: daysUnsold })}
                            </span>
                          )}
                          <h4 className="text-base font-extrabold text-copy-primary">{farmerName}&apos;s Field</h4>
                          <p className="text-xs text-copy-secondary">
                            📍 {villageName}, {district} • {acres.toFixed(1)} Acres (~{tonnes.toFixed(1)}t Straw)
                          </p>
                          {camp.farmer_phone && (
                            <p className="text-[11px] text-copy-muted">
                              📞 Contact: <span className="font-mono font-medium">{camp.farmer_phone}</span>
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-copy-muted uppercase font-bold">Clearance Cost</p>
                          <p className="text-base font-black text-copy-primary">₹{goal.toLocaleString()}</p>
                          <span className="text-[10px] text-copy-muted font-medium">₹1,300 / acre</span>
                        </div>
                      </div>

                      {/* Progress Bar & Target */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs text-copy-secondary">
                          <span>Funded: <strong className="text-copy-primary">₹{funded.toLocaleString()}</strong></span>
                          <span><strong>{pct}%</strong> ({remaining > 0 ? `₹${remaining.toLocaleString()} left` : 'Fully Funded'})</span>
                        </div>
                        <div className="w-full bg-bg-subtle rounded-full h-2.5 overflow-hidden border border-surface-border-subtle">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              isCleared ? 'bg-state-success' : 'bg-brand'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Environmental Breakdown Badges */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-bg-subtle/80 rounded-2xl border border-surface-border text-copy-secondary">
                        <div>
                          <span className="text-copy-muted block font-medium">CO2 Prevented:</span>
                          <span className="font-bold text-state-success">~{(tonnes * 1.45).toFixed(1)} MT</span>
                        </div>
                        <div>
                          <span className="text-copy-muted block font-medium">PM2.5 Smog:</span>
                          <span className="font-bold text-state-error">~{(tonnes * 34).toFixed(0)} kg prevented</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 space-y-2">
                      {isCleared ? (
                        <div className="space-y-1.5">
                          <div className="w-full py-2.5 px-3 bg-state-success-dim text-state-success border border-state-success/30 rounded-xl text-center text-xs font-bold">
                            ✓ Machine Balers On-Site • Smoke Prevented
                          </div>
                          <button
                            type="button"
                            onClick={() => handleManualNgoCall(camp.id)}
                            className="w-full py-1 text-[11px] text-copy-muted hover:text-copy-primary text-center font-medium cursor-pointer"
                          >
                            View NGO Dispatch Telemetry ➔
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModalCampaign(camp)
                              setDonationAmount(Math.min(remaining, 1300) || 1300)
                            }}
                            className="w-full bg-brand text-on-brand py-2.5 px-4 rounded-xl font-bold text-xs hover:bg-accent-secondary active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>🛡️</span>
                            <span>{t('donor.rescue_field_btn', '🛡️ Rescue This Field')}</span>
                          </button>
                          <button
                            type="button"
                            disabled={callingCampaignId === camp.id}
                            onClick={() => handleManualNgoCall(camp.id)}
                            className="w-full py-1.5 px-3 border border-surface-border text-copy-secondary hover:text-copy-primary hover:bg-bg-subtle rounded-xl text-[11px] font-medium transition-all cursor-pointer"
                          >
                            {callingCampaignId === camp.id ? 'Calling Nearby NGO...' : '🚜 Dispatch NGO Machinery (Test Run)'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: LIVE IMPACT SIMULATOR ================= */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-surface border-2 border-surface-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="max-w-2xl space-y-1">
              <span className="text-xs font-bold text-brand uppercase tracking-wider">Zero-Smog Calculator</span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-copy-primary">
                {t('donor.sim_title', 'Interactive Clean Air Impact Simulator')}
              </h3>
              <p className="text-xs sm:text-sm text-copy-secondary">
                {t('donor.sim_sub', 'Choose or enter any contribution amount to see the exact real-world impact of your donation on northern skies.')}
              </p>
            </div>

            {/* Slider & Presets */}
            <div className="space-y-4 bg-bg-subtle p-5 rounded-2xl border border-surface-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-copy-primary">
                  Contribution Amount: <span className="text-base text-brand font-black">₹{simAmount.toLocaleString()}</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[500, 1000, 1300, 2600, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSimAmount(amt)}
                      className={`px-2.5 py-1 text-xs rounded-xl font-bold border transition-all cursor-pointer ${
                        simAmount === amt
                          ? 'bg-brand text-on-brand border-brand'
                          : 'bg-surface border-surface-border text-copy-secondary hover:bg-surface-border/50'
                      }`}
                    >
                      ₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="range"
                min="300"
                max="20000"
                step="100"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-copy-muted font-mono">
                <span>₹300 (Micro contribution)</span>
                <span>₹1,300 (1 Full Acre)</span>
                <span>₹20,000 (15+ Acres Village Rescue)</span>
              </div>
            </div>

            {/* Calculated Impact Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-bg-subtle/80 border border-surface-border rounded-2xl p-4 space-y-1">
                <span className="text-2xl">🚜</span>
                <p className="text-xs font-semibold text-copy-secondary">{t('donor.sim_acres_cleared', 'Farmland Cleared')}</p>
                <p className="text-2xl font-black text-copy-primary">{simAcres} <span className="text-xs font-bold text-copy-muted">Acres</span></p>
                <p className="text-[11px] text-copy-muted">100% tractor baler rental funded</p>
              </div>

              <div className="bg-bg-subtle/80 border border-surface-border rounded-2xl p-4 space-y-1">
                <span className="text-2xl">🌾</span>
                <p className="text-xs font-semibold text-copy-secondary">{t('donor.sim_straw_baled', 'Stubble Baled')}</p>
                <p className="text-2xl font-black text-brand">{simStrawTonnes} <span className="text-xs font-bold text-copy-muted">Tonnes</span></p>
                <p className="text-[11px] text-copy-muted">Diverted directly to bio-power plants</p>
              </div>

              <div className="bg-bg-subtle/80 border border-surface-border rounded-2xl p-4 space-y-1">
                <span className="text-2xl">💨</span>
                <p className="text-xs font-semibold text-copy-secondary">{t('donor.sim_pm25_prevented', 'Toxic PM2.5 Averted')}</p>
                <p className="text-2xl font-black text-state-error">{simPm25} <span className="text-xs font-bold text-copy-muted">Kg</span></p>
                <p className="text-[11px] text-copy-muted">Toxic smoke prevented from rising</p>
              </div>

              <div className="bg-bg-subtle/80 border border-surface-border rounded-2xl p-4 space-y-1">
                <span className="text-2xl">🌍</span>
                <p className="text-xs font-semibold text-copy-secondary">{t('donor.sim_co2_prevented', 'CO2 Emissions Prevented')}</p>
                <p className="text-2xl font-black text-state-success">{simCo2} <span className="text-xs font-bold text-copy-muted">MT CO2</span></p>
                <p className="text-[11px] text-copy-muted">Equivalent to {(simCo2 * 4.2).toFixed(0)} passenger car trips</p>
              </div>

              <div className="bg-bg-subtle/80 border border-surface-border rounded-2xl p-4 space-y-1">
                <span className="text-2xl">👶</span>
                <p className="text-xs font-semibold text-copy-secondary">{t('donor.sim_people_shielded', 'Citizens Shielded Downwind')}</p>
                <p className="text-2xl font-black text-copy-primary">~{simPeopleShielded.toLocaleString()}</p>
                <p className="text-[11px] text-copy-muted">Children &amp; elderly protected from smog</p>
              </div>

              <div className="bg-bg-subtle/80 border border-surface-border rounded-2xl p-4 space-y-1">
                <span className="text-2xl">🍃</span>
                <p className="text-xs font-semibold text-copy-secondary">{t('donor.sim_clean_air_hours', 'Hours of Clean Air Funded')}</p>
                <p className="text-2xl font-black text-state-success">{simCleanAirHours.toLocaleString()} <span className="text-xs font-bold text-copy-muted">Hrs</span></p>
                <p className="text-[11px] text-copy-muted">Cumulative breathable atmosphere</p>
              </div>
            </div>

            {/* Direct CTA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-brand/5 border border-brand/20 rounded-2xl">
              <div className="space-y-0.5">
                <h4 className="font-bold text-copy-primary text-sm">Ready to make this exact impact today?</h4>
                <p className="text-xs text-copy-secondary">Every donation calls and dispatches a verified Punjab baler team within 24 hours.</p>
              </div>
              <button
                type="button"
                onClick={() => openFirstCampaignWithAmount(simAmount)}
                className="px-6 py-3 bg-brand text-on-brand rounded-xl font-bold text-xs hover:bg-accent-secondary transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                {t('donor.sim_cta', 'Rescue {{acres}} Acre with ₹{{amount}}', { acres: simAcres, amount: simAmount.toLocaleString() })} ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: DOWNWIND AIR SHIELD ================= */}
      {activeTab === 'wind' && (
        <div className="space-y-6">
          <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-copy-primary">
                  {t('donor.wind_title', 'Wind-Link Trajectory Ranking ({{city}} Focus)', { city: selectedCity })}
                </h3>
                <p className="text-xs text-copy-secondary mt-0.5">
                  {t('donor.wind_subtitle', 'Villages identified where preventing fires has the highest direct impact on reducing downwind air pollution.')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-copy-secondary whitespace-nowrap">{t('donor.downwind_city', 'Downwind City:')}</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="border border-surface-border bg-surface text-copy-primary text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-brand outline-none cursor-pointer"
                >
                  <option value="Delhi">Delhi NCR</option>
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Ludhiana">Ludhiana</option>
                  <option value="Amritsar">Amritsar</option>
                  <option value="Bathinda">Bathinda</option>
                </select>
              </div>
            </div>

            {/* Atmospheric Trajectory Explainer */}
            <div className="p-4 bg-bg-subtle rounded-2xl border border-surface-border text-xs text-copy-secondary space-y-1">
              <span className="font-bold text-copy-primary block">🌬️ Atmospheric Wind Path Analysis:</span>
              <p>
                During harvest season (October–November), northwesterly winds travel at 15–25 km/h, carrying stubble smoke into <strong>{selectedCity}</strong> within 14–18 hours. Preventing fires in these upstream agricultural hubs stops PM2.5 concentrations from spiking into the hazardous range.
              </p>
            </div>

            {/* Ranked Village Cards */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              {ranked.slice(0, 4).map((r, i) => (
                <div
                  key={i}
                  className="bg-surface border border-surface-border hover:border-brand/40 rounded-2xl p-4 flex justify-between items-center shadow-xs transition-all"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-copy-primary text-sm">{r.village?.name || 'Upstream Agricultural Zone'}</p>
                    <p className="text-xs text-copy-secondary">
                      {t('donor.exposure_index', 'Downwind Exposure Index:')} <strong className="text-copy-primary">{r.influence_score}/100</strong>
                      {r.distance_km ? ` • ${t('donor.km_away', '{{dist}} km away', { dist: r.distance_km })}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => openFirstCampaignWithAmount(1300)}
                      className="text-[11px] font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <span>🛡️</span> {t('donor.fund_village_btn', 'Fund Clearance in this Village →')}
                    </button>
                  </div>
                  <span className="bg-state-warning-dim text-state-warning text-xs font-bold px-2.5 py-1 rounded-full border border-state-warning/30 shrink-0">
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* General NGO Clean Air Fund */}
          <div className="bg-surface border border-surface-border rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-lg font-bold text-copy-primary">{t('donor.direct_title', 'Direct NGO Clean Air Fund')}</h3>
              <p className="text-xs text-copy-secondary mt-0.5">
                {t('donor.direct_subtitle', 'Support verified ground NGOs equipping machinery and providing baler subsidies across North India.')}
              </p>
            </div>

            <form onSubmit={handleGeneralDonate} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-copy-secondary mb-1">{t('donor.select_ngo_label', 'Select Verified NGO')}</label>
                  <select
                    name="ngo_id"
                    required
                    className="w-full border border-surface-border bg-surface rounded-xl p-2.5 text-xs text-copy-primary font-medium focus:ring-2 focus:ring-brand outline-none"
                  >
                    <option value="">{t('donor.choose_ngo', 'Choose an NGO...')}</option>
                    {ngos.map((n) => (
                      <option key={n.profile_id} value={n.profile_id}>
                        {n.profiles?.name || 'Clean Air Trust'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-copy-secondary mb-1">{t('donor.amount_label', 'Contribution Amount (₹)')}</label>
                  <input
                    name="amount"
                    type="number"
                    required
                    min="100"
                    value={directAmount}
                    onChange={(e) => setDirectAmount(Number(e.target.value) || 0)}
                    className="w-full border border-surface-border bg-surface rounded-xl p-2.5 text-xs text-copy-primary font-bold focus:ring-2 focus:ring-brand outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-brand text-on-brand rounded-xl py-2.5 font-bold text-xs hover:bg-accent-secondary transition-colors shadow-xs cursor-pointer"
                  >
                    {t('donor.donate_btn', 'Donate to Clean Air Fund')}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 p-3 bg-bg-subtle rounded-xl text-xs text-copy-secondary border border-surface-border">
                <span className="font-bold text-copy-primary">{t('donor.estimated_impact', '🌾 Estimated Citizen Impact:')}</span>
                <span>
                  <strong className="text-copy-primary">
                    {t('donor.impact_straw', '~{{tonnes}}t of paddy straw cleanly baled & diverted', { tonnes: (directAmount / 520).toFixed(1) })}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  <strong className="text-copy-primary">
                    {t('donor.impact_acres', '~{{acres}} acres saved from smoke pollution', { acres: (directAmount / 1300).toFixed(1) })}
                  </strong>
                </span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAB 4: MY IMPACT & HONOURS ================= */}
      {activeTab === 'honours' && (
        <div className="space-y-6">
          {/* Personal Impact Scoreboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs">
              <p className="text-xs font-semibold text-copy-secondary">{t('donor.stat_contributed', 'Total Contributed')}</p>
              <p className="text-2xl font-black text-brand mt-1">₹{totalDonated.toLocaleString()}</p>
              <p className="text-[11px] text-copy-muted mt-0.5">{history.length} contributions</p>
            </div>
            <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs">
              <p className="text-xs font-semibold text-copy-secondary">{t('donor.stat_cleared', 'Fields Cleared')}</p>
              <p className="text-2xl font-black text-copy-primary mt-1">{totalPersonalAcres > 0 ? totalPersonalAcres : 1} <span className="text-xs font-bold text-copy-muted">Acres</span></p>
              <p className="text-[11px] text-copy-muted mt-0.5">Machine baler deployed</p>
            </div>
            <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs">
              <p className="text-xs font-semibold text-copy-secondary">{t('donor.stat_diverted', 'Stubble Diverted')}</p>
              <p className="text-2xl font-black text-state-success mt-1">{totalPersonalStraw > 0 ? totalPersonalStraw : 2.5} <span className="text-xs font-bold text-copy-muted">Tonnes</span></p>
              <p className="text-[11px] text-copy-muted mt-0.5">Sent to bio-energy plants</p>
            </div>
            <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs">
              <p className="text-xs font-semibold text-copy-secondary">{t('donor.stat_smoke_prevented', 'Smog Prevented')}</p>
              <p className="text-2xl font-black text-state-error mt-1">{totalPersonalCo2 > 0 ? totalPersonalCo2 : 3.6} <span className="text-xs font-bold text-copy-muted">MT CO2</span></p>
              <p className="text-[11px] text-copy-muted mt-0.5">Clean skies verified</p>
            </div>
          </div>

          {/* ================= CLEAN AIR GUARDIAN IMPACT CERTIFICATE ================= */}
          <div className="bg-surface border-4 border-double border-brand/40 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏅</span>
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-brand uppercase font-bold">
                    Official Recognition Document
                  </span>
                  <h3 className="text-xl font-black text-copy-primary">
                    {t('donor.cert_title', 'Verified Clean Air Guardian Certificate')}
                  </h3>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-state-success-dim text-state-success border border-state-success/30 self-start sm:self-auto">
                {t('donor.cert_seal', 'OFFICIAL ZERO-BURN IMPACT SEAL')}
              </span>
            </div>

            <div className="space-y-3 max-w-2xl">
              <p className="text-xs text-copy-secondary uppercase tracking-wider font-semibold">
                {t('donor.cert_awarded_to', 'Presented To')}:
              </p>
              <h4 className="text-2xl sm:text-3xl font-serif font-bold text-copy-primary">
                Global Clean Air Guardian
              </h4>
              <p className="text-xs sm:text-sm text-copy-secondary leading-relaxed">
                {t(
                  'donor.cert_sub',
                  'Honouring your personal contribution to smog prevention and sustainable agricultural bio-energy.'
                )}
              </p>
            </div>

            {/* Official Impact Metadata Ledger Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-bg-subtle rounded-2xl border border-surface-border text-xs">
              <div>
                <span className="text-copy-muted block font-medium">Impact Status:</span>
                <span className="font-bold text-state-success">✓ Verified Zero-Burn</span>
              </div>
              <div>
                <span className="text-copy-muted block font-medium">Clearance Territory:</span>
                <span className="font-bold text-copy-primary">Punjab &amp; North India</span>
              </div>
              <div>
                <span className="text-copy-muted block font-medium">Dispatched Partner:</span>
                <span className="font-bold text-copy-primary">Clean Air Action NGO</span>
              </div>
              <div>
                <span className="text-copy-muted block font-medium">Verification Key:</span>
                <span className="font-mono font-bold text-copy-primary">RL-CAG-{(effectiveUserId || '88').slice(0, 8)}</span>
              </div>
            </div>

            {/* Share & Copy Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-copy-muted">
                {t('donor.cert_dispatched_by', 'Dispatched via Punjab Clean Air & Bio-Energy Action')}
              </span>
              <button
                type="button"
                onClick={copyShareText}
                className="w-full sm:w-auto px-5 py-2.5 bg-brand text-on-brand rounded-xl font-bold text-xs hover:bg-accent-secondary transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📋</span>
                <span>{certCopied ? t('donor.cert_copied', 'Impact message copied to clipboard!') : t('donor.cert_share_btn', 'Share Impact on WhatsApp / Social')}</span>
              </button>
            </div>
          </div>

          {/* Citizen Impact History List */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-copy-primary">
              {isPublicView ? 'Global Citizen Impact Tracker' : t('donor.history_title', 'Your Citizen Impact History')}
            </h3>
            {history.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center text-xs text-copy-secondary">
                {t('donor.no_history', 'No contributions yet. Start by crowdfunding a plot above!')}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="bg-surface border border-surface-border rounded-2xl p-4 flex justify-between items-center shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-copy-primary text-sm">
                          {t('donor.contribution_to', 'Contribution to {{name}}', { name: h.ngos?.profiles?.name || 'Clean Air Collective' })}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-state-success-dim text-state-success">
                          {t('donor.deployed', '✓ Deployed')}
                        </span>
                      </div>
                      <p className="text-xs text-copy-secondary mt-0.5">
                        {new Date(h.created_at).toLocaleDateString()} • {t('donor.straw_diverted', '~{{tonnes}}t Straw Diverted', { tonnes: (h.amount / 520).toFixed(1) })}
                      </p>
                    </div>
                    <p className="font-black text-brand text-base">₹{h.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-copy-primary">{t('donor.notifications_title', 'Impact Notifications')}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {notifications.map((n) => (
                  <div key={n.id} className="bg-surface border border-brand/20 rounded-2xl p-4 shadow-xs">
                    <p className="text-sm text-copy-primary font-medium">{n.message}</p>
                    <p className="text-xs text-copy-secondary mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= STRIPE DONATION MODAL ================= */}
      {activeModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface border border-surface-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand">Stripe Test Gateway</span>
                <h3 className="text-xl font-extrabold text-copy-primary mt-0.5">
                  Rescue {activeModalCampaign.farmer_name}&apos;s Field
                </h3>
                <p className="text-xs text-copy-secondary mt-0.5">
                  📍 {activeModalCampaign.village_name} • {activeModalCampaign.acres} Acres (~{activeModalCampaign.est_tonnes}t Stubble)
                </p>
              </div>
              <button
                onClick={() => setActiveModalCampaign(null)}
                className="text-copy-muted hover:text-copy-primary text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Campaign Urgency Detail */}
            <div className="p-3.5 bg-state-error-dim/40 border border-state-error/20 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-state-error flex items-center gap-1">
                <span>⏱️</span> Farmer Notice: Unsold for {activeModalCampaign.days_unsold || 3} days by buyers
              </p>
              <p className="text-copy-secondary leading-relaxed">
                To prevent imminent burning, citizen funds immediately call and dispatch <strong>Punjab Clean Air &amp; Bio-Energy Action</strong> with tractor balers.
              </p>
            </div>

            {/* Simulated Credit Card Graphic */}
            <div className="rounded-2xl p-4 bg-gradient-to-tr from-copy-primary to-copy-secondary text-white shadow-md relative overflow-hidden space-y-3">
              <div className="flex justify-between items-center text-xs opacity-80">
                <span className="font-mono tracking-widest uppercase">Stripe Sandbox Card</span>
                <span className="font-bold text-brand bg-black/40 px-2 py-0.5 rounded">TEST MODE</span>
              </div>
              <div className="font-mono text-lg tracking-widest font-bold">
                4242 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242
              </div>
              <div className="flex justify-between items-end text-[11px] opacity-80">
                <div>
                  <span className="block text-[9px] uppercase">Cardholder</span>
                  <span className="font-medium uppercase">Global Clean Air Guardian</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase">Expires</span>
                  <span className="font-medium">12/28</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase">CVC</span>
                  <span className="font-medium">123</span>
                </div>
              </div>
            </div>

            {/* Donation Amount Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-copy-secondary">Select Contribution Amount (₹)</label>
              <div className="grid grid-cols-4 gap-2">
                {[500, 1000, 1300, Math.max(0, activeModalCampaign.amount_requested - (activeModalCampaign.amount_funded || 0))].map((amt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDonationAmount(amt || 1300)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      donationAmount === amt
                        ? 'bg-brand text-on-brand border-brand shadow-xs'
                        : 'bg-surface border-surface-border text-copy-primary hover:bg-bg-subtle'
                    }`}
                  >
                    {idx === 3 ? 'Full Goal' : `₹${amt.toLocaleString()}`}
                  </button>
                ))}
              </div>

              <div className="relative mt-2">
                <span className="absolute left-3 top-2.5 text-xs text-copy-muted font-bold">₹</span>
                <input
                  type="number"
                  min="100"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(Number(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 text-sm bg-surface border border-surface-border rounded-xl text-copy-primary font-bold focus:ring-2 focus:ring-brand outline-none"
                  placeholder="Enter custom amount"
                />
              </div>

              <p className="text-[11px] text-copy-muted">
                Your ₹{donationAmount.toLocaleString()} funds ~{(donationAmount / 1300).toFixed(2)} acre(s) of tractor baling and stops ~{((donationAmount / 1300) * 2.5 * 1.45).toFixed(1)}t CO2.
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-1 border-t border-surface-border">
              <label className="block text-xs font-bold text-copy-secondary">Stripe Gateway Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('dummy')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    paymentMode === 'dummy'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-surface-border bg-surface hover:bg-bg-subtle'
                  }`}
                >
                  <span className="font-bold text-copy-primary block">Instant Sandbox Card (4242)</span>
                  <span className="text-[11px] text-copy-muted block mt-0.5">Immediate authorization &amp; NGO dispatch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('hosted')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    paymentMode === 'hosted'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-surface-border bg-surface hover:bg-bg-subtle'
                  }`}
                >
                  <span className="font-bold text-copy-primary block">Stripe Hosted Checkout</span>
                  <span className="text-[11px] text-copy-muted block mt-0.5">Redirect to official checkout.stripe.com</span>
                </button>
              </div>
            </div>

            {/* Processing Step Indicator */}
            {isProcessingStripe && stripeStepMsg && (
              <div className="p-3 bg-brand/10 border border-brand/30 rounded-xl text-xs text-copy-primary flex items-center gap-2 animate-pulse">
                <span>⏳</span>
                <span className="font-medium">{stripeStepMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessingStripe || donationAmount <= 0}
                onClick={handleStripeDonate}
                className="flex-1 bg-brand text-on-brand py-3 px-4 rounded-xl text-xs font-bold hover:bg-accent-secondary disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessingStripe ? (
                  <span>Processing with Stripe...</span>
                ) : (
                  <>
                    <span>Confirm ₹{donationAmount.toLocaleString()} via Stripe</span>
                    <span>➔</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveModalCampaign(null)}
                className="px-4 py-3 rounded-xl border border-surface-border text-xs font-semibold text-copy-secondary hover:bg-bg-subtle cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
