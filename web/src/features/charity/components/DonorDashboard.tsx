import { useState, useEffect, useCallback } from 'react'
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
  const [history, setHistory] = useState<
    { id: string; amount: number; created_at: string; ngos?: { profiles?: { name: string } } }[]
  >([])
  const [ngos, setNgos] = useState<{ profile_id: string; profiles?: { name: string } }[]>([])
  const [ranked, setRanked] = useState<{ influence_score: number; label: string; village?: { name: string }; distance_km?: number }[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])
  const [campaigns, setCampaigns] = useState<CrowdfundingCampaign[]>([])
  const [donationMsg, setDonationMsg] = useState<string | null>(null)
  const [activeModalCampaign, setActiveModalCampaign] = useState<CrowdfundingCampaign | null>(null)
  const [donationAmount, setDonationAmount] = useState<number>(1000)
  const [isProcessingStripe, setIsProcessingStripe] = useState<boolean>(false)
  const [stripeStepMsg, setStripeStepMsg] = useState<string>('')
  const [dispatchedMission, setDispatchedMission] = useState<NgoDispatchDetails | null>(null)
  const [directAmount, setDirectAmount] = useState<number>(1000)
  const [selectedCity, setSelectedCity] = useState<string>('Delhi')
  const [paymentMode, setPaymentMode] = useState<'dummy' | 'hosted'>('dummy')
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [callingCampaignId, setCallingCampaignId] = useState<string | null>(null)

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
      setDonationMsg(`🌾 Database Sync Complete! Checked open listings: ${res.count} unsold stubble plots verified and synced with farmer demand estimations.`)
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
    const amt = Number(params.get('amount') || 1000)

    if (stripeStatus === 'success' && campaignId) {
      confirmStripePayment({
        campaign_id: campaignId,
        amount: amt,
        session_id: sessionId || undefined,
        donor_id: effectiveUserId,
      })
        .then((res) => {
          setDonationMsg(`🎉 Stripe payment verified! Contributed ₹${amt.toLocaleString()} to prevent field fire.`)
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
      setDonationMsg('Thank you! Your general donation was received and will fund baling operations.')
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
        `🎉 Stripe Dummy Payment Successful! ₹${donationAmount.toLocaleString()} funded for ${activeModalCampaign.farmer_name || 'Farmer'}.`
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

  // Total summary metrics
  const totalAcresAtRisk = campaigns.reduce((acc, c) => acc + (c.acres || 8), 0)
  const totalTonnesAtRisk = campaigns.reduce((acc, c) => acc + (c.est_tonnes || 20), 0)
  const totalCo2Prevented = campaigns.reduce((acc, c) => acc + (c.co2_prevented_tonnes || 30), 0)

  return (
    <div className="space-y-8">
      {/* Success Notification Alert */}
      {donationMsg && (
        <div className="rounded-xl bg-state-success-dim border border-state-success/30 p-4 text-sm text-state-success flex items-center justify-between shadow-xs">
          <p className="font-medium">{donationMsg}</p>
          <button
            onClick={() => setDonationMsg(null)}
            className="text-xs uppercase font-semibold opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Global Impact Header */}
      <div className="relative overflow-hidden rounded-2xl bg-surface border border-surface-border p-6 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-state-error-dim border border-state-error/30 text-state-error text-xs font-semibold">
            <span>🔥</span> Critical 2–3 Day Burn-Risk Rescue Window
          </div>
          <h2 className="text-2xl font-bold text-copy-primary">
            Citizen Stubble Clearance & Anti-Burning Fund
          </h2>
          <p className="text-sm text-copy-secondary">
            When industrial buyers don&apos;t purchase a farmer&apos;s stubble within 2–3 days, farmers face urgent pressure to burn their fields for wheat sowing. Global citizens can crowdfund machine clearance costs here—we automatically dispatch a nearby NGO with balers to clear the crop cleanly!
          </p>
        </div>

        {/* Global Impact Counter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-surface-border">
          <div className="bg-bg-subtle/80 rounded-xl p-3 border border-surface-border">
            <p className="text-xs text-copy-secondary">Farmland At Burn Risk</p>
            <p className="text-xl font-bold text-copy-primary mt-0.5">{totalAcresAtRisk.toFixed(1)} Acres</p>
            <p className="text-[11px] text-copy-muted">~{totalTonnesAtRisk.toFixed(1)} tonnes paddy straw</p>
          </div>
          <div className="bg-bg-subtle/80 rounded-xl p-3 border border-surface-border">
            <p className="text-xs text-copy-secondary">Potential CO2 Prevention</p>
            <p className="text-xl font-bold text-state-success mt-0.5">{totalCo2Prevented.toFixed(1)} MT CO2</p>
            <p className="text-[11px] text-copy-muted">Equivalent to taking 120 cars off roads</p>
          </div>
          <div className="bg-bg-subtle/80 rounded-xl p-3 border border-surface-border">
            <p className="text-xs text-copy-secondary">Payment Processing</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-bold text-sm text-brand">Stripe Test Gateway</span>
              <span className="text-[10px] bg-state-success-dim text-state-success px-1.5 py-0.5 rounded-full font-medium">
                Live &amp; Verified
              </span>
            </div>
            <p className="text-[11px] text-copy-muted">Card 4242 or official checkout</p>
          </div>
        </div>
      </div>

      {/* Dispatched NGO Mission Banner (When a Campaign is Rescued) */}
      {dispatchedMission && (
        <div className="rounded-2xl bg-brand/5 border border-brand/30 p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚜</span>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Automated Clearance Dispatch Executed
                </span>
                <h3 className="text-lg font-bold text-copy-primary">
                  Nearby NGO Dispatched: {dispatchedMission.ngo_name}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setDispatchedMission(null)}
              className="text-xs font-semibold text-copy-muted hover:text-copy-primary px-2 py-1"
            >
              ✕ Dismiss
            </button>
          </div>

          <p className="text-sm text-copy-secondary">
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
              <span className="text-copy-muted block font-medium">WhatsApp Alert:</span>
              <span className="font-semibold text-copy-primary">Farmer notified not to burn field</span>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Crowdfunding Portal for Unsold Stubble */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface border border-surface-border p-4 rounded-2xl shadow-xs">
          <div>
            <h3 className="text-xl font-bold text-copy-primary flex items-center gap-2">
              <span>🌾</span> {t('donor.portal_title', 'Anti-Stubble Burning Crowdfunding Portal (Unsold 2–3 Days)')}
            </h3>
            <p className="text-sm text-copy-secondary mt-1">
              {t('donor.portal_sub', 'When stubble remains unsold in 2–3 days, farmers face pressure to burn. Crowdfund clearance costs (₹1,300/acre baler rate) so balers can clear fields cleanly!')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncUnsold}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-bg-subtle hover:bg-surface-border/50 text-copy-primary border border-surface-border transition-all disabled:opacity-50 shadow-xs cursor-pointer"
              title="Scan database for listings unsold by buyers for 2-3 days and list them on charity"
            >
              <span>{isSyncing ? '⏳ Syncing Database...' : '🔄 Sync 2-3 Day Unsold Stubble'}</span>
            </button>
            <span className="text-xs bg-state-error-dim text-state-error border border-state-error/30 font-semibold px-3 py-1.5 rounded-xl">
              {campaigns.filter((c) => c.status !== 'approved').length} {t('donor.urgent_action', 'Fields At Risk')}
            </span>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center space-y-2">
            <p className="font-semibold text-copy-primary">{t('donor.no_fields_risk', 'No Fields At Immediate Burning Risk')}</p>
            <p className="text-xs text-copy-secondary">
              {t('donor.no_fields_desc', 'All listed stubble is currently matched with industrial buyers. Any unsold farmer stubble will appear here for public crowdfunding.')}
            </p>
            <button
              type="button"
              onClick={handleSyncUnsold}
              className="mt-2 text-xs font-semibold text-brand underline"
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
                  className={`bg-surface border rounded-2xl p-5 shadow-xs space-y-4 relative flex flex-col justify-between transition-all ${
                    isCleared
                      ? 'border-state-success/40 bg-state-success-dim/10'
                      : 'border-surface-border hover:border-brand/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isCleared ? (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-state-success-dim text-state-success font-semibold border border-state-success/30">
                              ✓ 100% Rescued • Balers Dispatched
                            </span>
                          ) : (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-state-error-dim text-state-error font-semibold border border-state-error/30 animate-pulse">
                              ⏱️ Unsold {daysUnsold} Days • Burning Threat
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-copy-primary">{farmerName}&apos;s Field</h4>
                        <p className="text-xs text-copy-secondary">
                          📍 {villageName}, {district} • {acres.toFixed(1)} Acres (~{tonnes.toFixed(1)}t Straw)
                        </p>
                        {camp.farmer_phone && (
                          <p className="text-[11px] text-copy-muted">
                            📞 Contact: <span className="font-mono font-medium">{camp.farmer_phone}</span>
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] text-copy-muted">Clearance Cost</p>
                        <p className="text-base font-bold text-copy-primary">₹{goal.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Progress Bar & Target */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs text-copy-secondary">
                        <span>Funded: <strong>₹{funded.toLocaleString()}</strong></span>
                        <span>{pct}% ({remaining > 0 ? `₹${remaining.toLocaleString()} left` : 'Fully Funded'})</span>
                      </div>
                      <div className="w-full bg-bg-subtle rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            isCleared ? 'bg-state-success' : 'bg-brand'
                          }`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Cost & Environmental Breakdown Badges */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-bg-subtle/80 rounded-xl border border-surface-border text-copy-secondary">
                      <div>
                        <span className="text-copy-muted block">Baler Rate:</span>
                        <span className="font-semibold text-copy-primary">₹1,300/acre</span>
                      </div>
                      <div>
                        <span className="text-copy-muted block">CO2 Prevented:</span>
                        <span className="font-semibold text-state-success">~{(tonnes * 1.45).toFixed(1)} Tonnes</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2">
                    {isCleared ? (
                      <div className="space-y-1.5">
                        <div className="w-full py-2.5 px-3 bg-state-success-dim/40 border border-state-success/30 rounded-xl text-center text-xs font-semibold text-state-success">
                          🚜 Nearby NGO Called • Field Protected
                        </div>
                        <button
                          type="button"
                          onClick={() => handleManualNgoCall(camp.id)}
                          className="w-full py-1 text-[11px] text-copy-muted hover:text-copy-primary text-center font-medium"
                        >
                          View NGO Call Telemetry ➔
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModalCampaign(camp)
                            setDonationAmount(Math.min(remaining, 1000) || 500)
                          }}
                          className="w-full bg-brand text-on-brand py-2.5 px-4 rounded-xl font-semibold text-xs hover:bg-accent-secondary active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <span>🛡️</span>
                          <span>Donate via Stripe Dummy Gateway</span>
                        </button>
                        <button
                          type="button"
                          disabled={callingCampaignId === camp.id}
                          onClick={() => handleManualNgoCall(camp.id)}
                          className="w-full py-1.5 px-3 border border-surface-border text-copy-secondary hover:text-copy-primary hover:bg-bg-subtle rounded-xl text-[11px] font-medium transition-all"
                        >
                          {callingCampaignId === camp.id ? 'Calling Nearby NGO...' : '🚜 Call Nearby NGO Directly (Test Mode)'}
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

      {/* Stripe Payment & NGO Dispatch Modal */}
      {activeModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand">Stripe Dummy Payment Gateway</span>
                <h3 className="text-xl font-bold text-copy-primary mt-0.5">
                  Rescue {activeModalCampaign.farmer_name}&apos;s Field
                </h3>
                <p className="text-xs text-copy-secondary mt-0.5">
                  📍 {activeModalCampaign.village_name} • {activeModalCampaign.acres} Acres (~{activeModalCampaign.est_tonnes}t Stubble)
                </p>
              </div>
              <button
                onClick={() => setActiveModalCampaign(null)}
                className="text-copy-muted hover:text-copy-primary text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Campaign Urgency Detail */}
            <div className="p-3 bg-state-error-dim/40 border border-state-error/20 rounded-xl text-xs space-y-1">
              <p className="font-semibold text-state-error flex items-center gap-1">
                <span>⏱️</span> Farmer Notice: Unsold for {activeModalCampaign.days_unsold || 3} days by buyers
              </p>
              <p className="text-copy-secondary">
                To prevent imminent burning, citizen funds immediately call and dispatch <strong>Punjab Clean Air &amp; Bio-Energy Action</strong> with tractor balers.
              </p>
            </div>

            {/* Simulated Credit Card Graphic */}
            <div className="rounded-xl p-4 bg-gradient-to-tr from-copy-primary to-copy-secondary text-white shadow-md relative overflow-hidden space-y-3">
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
                  <span className="font-medium uppercase">Global Citizen Donor</span>
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
              <label className="block text-xs font-semibold text-copy-secondary">Select Contribution Amount (₹)</label>
              <div className="grid grid-cols-4 gap-2">
                {[500, 1000, 2500, Math.max(0, activeModalCampaign.amount_requested - (activeModalCampaign.amount_funded || 0))].map((amt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDonationAmount(amt || 500)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
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
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-1 border-t border-surface-border">
              <label className="block text-xs font-semibold text-copy-secondary">Stripe Gateway Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('dummy')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    paymentMode === 'dummy'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-surface-border bg-surface hover:bg-bg-subtle'
                  }`}
                >
                  <span className="font-bold text-copy-primary block">Instant Dummy Card (4242)</span>
                  <span className="text-[11px] text-copy-muted block mt-0.5">Instant authorization &amp; immediate NGO dispatch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('hosted')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
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

            {/* Test Credentials Helper Pill */}
            <div className="flex items-center gap-2 p-2.5 bg-bg-subtle rounded-xl text-[11px] text-copy-secondary border border-surface-border">
              <span className="text-brand font-bold">💳 Stripe Sandbox:</span>
              <span>Test Card: <code className="font-mono font-bold text-copy-primary">4242 4242 4242 4242</code> (Exp: 12/28, CVC: 123)</span>
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
                className="flex-1 bg-brand text-on-brand py-3 px-4 rounded-xl text-xs font-bold hover:bg-accent-secondary disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
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
                className="px-4 py-3 rounded-xl border border-surface-border text-xs font-semibold text-copy-secondary hover:bg-bg-subtle"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: General Clean Air NGO Donation */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs">
        <h3 className="text-lg font-semibold text-copy-primary mb-1">{t('donor.direct_title', 'Direct NGO Clean Air Fund')}</h3>
        <p className="text-xs text-copy-secondary mb-4">
          {t('donor.direct_subtitle', 'Support verified ground NGOs equipping machinery and providing baler subsidies across North India.')}
        </p>
        <form onSubmit={handleGeneralDonate} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-copy-secondary mb-1">{t('donor.select_ngo_label', 'Select Verified NGO')}</label>
              <select
                name="ngo_id"
                required
                className="w-full border border-surface-border bg-surface rounded-xl p-2.5 text-sm text-copy-primary focus:ring-2 focus:ring-accent-primary outline-none"
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
              <label className="block text-xs font-medium text-copy-secondary mb-1">{t('donor.amount_label', 'Contribution Amount (₹)')}</label>
              <input
                name="amount"
                type="number"
                required
                min="100"
                value={directAmount}
                onChange={(e) => setDirectAmount(Number(e.target.value) || 0)}
                className="w-full border border-surface-border bg-surface rounded-xl p-2.5 text-sm text-copy-primary focus:ring-2 focus:ring-accent-primary outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-brand text-on-brand rounded-xl py-2.5 font-medium text-sm hover:bg-accent-secondary transition-colors shadow-xs"
              >
                {t('donor.donate_btn', 'Donate to Clean Air Fund')}
              </button>
            </div>
          </div>

          {/* Dynamic Stubble Diverted Estimate Badge */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-bg-subtle rounded-xl text-xs text-copy-secondary border border-surface-border">
            <span className="font-semibold text-copy-primary">{t('donor.estimated_impact', '🌾 Estimated Citizen Impact:')}</span>
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

      {/* Section 3: Wind-Link Air Quality Influence Ranking */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-copy-primary">
              {t('donor.wind_title', 'Wind-Link Trajectory Ranking ({{city}} Focus)', { city: selectedCity })}
            </h3>
            <p className="text-xs text-copy-secondary">
              {t('donor.wind_subtitle', 'Villages identified where preventing fires has the highest direct impact on reducing downwind air pollution.')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-copy-secondary whitespace-nowrap">{t('donor.downwind_city', 'Downwind City:')}</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="border border-surface-border bg-surface text-copy-primary text-xs rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-accent-primary outline-none"
            >
              <option value="Delhi">Delhi NCR</option>
              <option value="Chandigarh">Chandigarh</option>
              <option value="Ludhiana">Ludhiana</option>
              <option value="Amritsar">Amritsar</option>
              <option value="Bathinda">Bathinda</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ranked.slice(0, 4).map((r, i) => (
            <div
              key={i}
              className="bg-surface border border-surface-border rounded-xl p-4 flex justify-between items-center shadow-xs"
            >
              <div>
                <p className="font-semibold text-copy-primary text-sm">{r.village?.name || 'Village Area'}</p>
                <p className="text-xs text-copy-secondary mt-0.5">
                  {t('donor.exposure_index', 'Downwind Exposure Index:')} <strong className="text-copy-primary">{r.influence_score}</strong>
                  {r.distance_km ? ` • ${t('donor.km_away', '{{dist}} km away', { dist: r.distance_km })}` : ''}
                </p>
              </div>
              <span className="bg-state-warning-dim text-state-warning text-xs font-medium px-2.5 py-1 rounded-full border border-state-warning/30">
                {r.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Your Impact History */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-copy-primary">
          {isPublicView ? 'Global Citizen Impact Tracker' : t('donor.history_title', 'Your Citizen Impact History')}
        </h3>
        {isPublicView && (
          <p className="text-xs text-copy-secondary">
            Contributing as an international supporter. Any donation made here via Stripe triggers automated ground baler dispatch in Punjab!
          </p>
        )}
        {history.length === 0 ? (
          <p className="text-xs text-copy-secondary">{t('donor.no_history', 'No contributions yet. Start by crowdfunding a plot above!')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="bg-surface border border-surface-border rounded-xl p-4 flex justify-between items-center shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-copy-primary text-sm">
                      {t('donor.contribution_to', 'Contribution to {{name}}', { name: h.ngos?.profiles?.name || 'Clean Air Collective' })}
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-state-success-dim text-state-success">
                      {t('donor.deployed', '✓ Deployed')}
                    </span>
                  </div>
                  <p className="text-xs text-copy-secondary mt-0.5">
                    {new Date(h.created_at).toLocaleDateString()} • {t('donor.straw_diverted', '~{{tonnes}}t Straw Diverted', { tonnes: (h.amount / 520).toFixed(1) })}
                  </p>
                </div>
                <p className="font-bold text-brand">₹{h.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Real-time Citizen Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-copy-primary">{t('donor.notifications_title', 'Impact Notifications')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {notifications.map((n) => (
              <div key={n.id} className="bg-surface border border-brand/20 rounded-xl p-4 shadow-xs">
                <p className="text-sm text-copy-primary">{n.message}</p>
                <p className="text-xs text-copy-secondary mt-2">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
