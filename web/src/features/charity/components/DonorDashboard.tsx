import { useState, useEffect } from 'react'
import {
  getDonorHistory,
  getNGOs,
  createDonation,
  getRankedVillages,
  getNotifications,
  getCrowdfundingCampaigns,
} from '../api'

interface CrowdfundingCampaign {
  id: string
  amount_requested: number
  amount_funded?: number
  purpose: string
  status: string
  created_at: string
  ngo_id: string
  ngo_name?: string
  farmer_name?: string
  village_name?: string
  target_village_id?: string
  acres?: number
  est_tonnes?: number
  fire_risk?: string
  farmers?: { profiles?: { name: string } }
  ngos?: { profiles?: { name: string } }
  listings?: {
    id: string
    est_tonnes?: number
    plots?: { acres?: number; village_id?: string; villages?: { name: string } }
  }
}

export function DonorDashboard({ userId }: { userId: string }) {
  const [history, setHistory] = useState<
    { id: string; amount: number; created_at: string; ngos?: { profiles?: { name: string } } }[]
  >([])
  const [ngos, setNgos] = useState<{ profile_id: string; profiles?: { name: string } }[]>([])
  const [ranked, setRanked] = useState<{ influence_score: number; label: string; village?: { name: string } }[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])
  const [campaigns, setCampaigns] = useState<CrowdfundingCampaign[]>([])
  const [donationMsg, setDonationMsg] = useState<string | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState<number>(500)

  const loadData = async () => {
    try {
      const [h, n, r, notifs, camps] = await Promise.all([
        getDonorHistory(userId),
        getNGOs(),
        getRankedVillages('Delhi'),
        getNotifications(userId),
        getCrowdfundingCampaigns(),
      ])
      setHistory(h)
      setNgos(n)
      setRanked(r)
      setNotifications(notifs)
      setCampaigns(camps as unknown as CrowdfundingCampaign[])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [userId])

  const handleGeneralDonate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    try {
      await createDonation({
        ngo_id: form.ngo_id.value,
        amount: Number(form.amount.value),
      })
      form.reset()
      setDonationMsg('Thank you! Your donation was received and will help clear stubble cleanly.')
      loadData()
    } catch (err: unknown) {
      setDonationMsg(err instanceof Error ? err.message : 'Donation failed')
    }
  }

  const handleCampaignDonate = async (campaign: CrowdfundingCampaign, amount: number) => {
    try {
      await createDonation({
        ngo_id: campaign.ngo_id,
        amount,
        target_village_id: campaign.target_village_id || campaign.listings?.plots?.village_id,
        campaign_id: campaign.id,
      })
      setDonationMsg(`🎉 Thank you for contributing ₹${amount}! You just helped save a field from burning.`)
      setSelectedCampaignId(null)
      loadData()
    } catch (err: unknown) {
      setDonationMsg(err instanceof Error ? err.message : 'Contribution failed')
    }
  }

  return (
    <div className="space-y-8">
      {donationMsg && (
        <div className="rounded-xl bg-state-success-dim border border-state-success/30 p-4 text-sm text-state-success flex items-center justify-between">
          <p className="font-medium">{donationMsg}</p>
          <button
            onClick={() => setDonationMsg(null)}
            className="text-xs uppercase font-semibold opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Section 1: Crowdfunding Portal for Unsold Stubble */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold text-copy-primary flex items-center gap-2">
              <span>🌾</span> Anti-Stubble Burning Crowdfunding Portal
            </h3>
            <p className="text-sm text-copy-secondary mt-1">
              When stubble remains unsold in 2–3 days, farmers face pressure to burn. Crowdfund clearance costs so balers can clear their fields cleanly!
            </p>
          </div>
          <span className="text-xs bg-state-error-dim text-state-error border border-state-error/30 font-semibold px-3 py-1 rounded-full self-start sm:self-auto">
            Urgent Citizen Action
          </span>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center space-y-2">
            <p className="font-semibold text-copy-primary">No Fields At Immediate Burning Risk</p>
            <p className="text-xs text-copy-secondary">
              All listed stubble is currently matched with industrial buyers. Any unsold farmer stubble will appear here for public crowdfunding.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {campaigns.map((camp) => {
              const acres = camp.acres ?? camp.listings?.plots?.acres ?? 10
              const tonnes = camp.est_tonnes ?? camp.listings?.est_tonnes ?? acres * 2.5
              const goal = camp.amount_requested || acres * 500
              const funded = camp.amount_funded ?? 0
              const pct = Math.min(100, Math.round((funded / (goal || 1)) * 100))
              const farmerName = camp.farmer_name || camp.farmers?.profiles?.name || 'Local Farmer'
              const villageName = camp.village_name || camp.listings?.plots?.villages?.name || 'Moga District'

              return (
                <div
                  key={camp.id}
                  className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-state-error-dim text-state-error font-medium">
                          🔥 Fire Risk (Unsold &gt; 2 Days)
                        </span>
                        <span className="text-xs text-copy-secondary">
                          {acres} Acres • ~{tonnes.toFixed(1)}t Straw
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-copy-primary mt-1.5">{farmerName}&apos;s Field</h4>
                      <p className="text-xs text-copy-secondary mt-0.5">
                        📍 {villageName} • {camp.purpose}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-copy-secondary">Goal</p>
                      <p className="text-lg font-bold text-copy-primary">₹{goal.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Progress visualization */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-copy-secondary">
                      <span>Funded by Citizens: ₹{funded.toLocaleString()}</span>
                      <span>Target: ₹{goal.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-bg-subtle rounded-full h-2.5 overflow-hidden">
                      <div className="bg-brand h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>

                  {/* Action / Donation buttons */}
                  {selectedCampaignId === camp.id ? (
                    <div className="pt-2 border-t border-surface-border space-y-2">
                      <div className="flex gap-2">
                        {[250, 500, 1000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setCustomAmount(amt)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                              customAmount === amt
                                ? 'bg-brand text-on-brand border-brand'
                                : 'bg-surface border-surface-border text-copy-primary hover:bg-bg-subtle'
                            }`}
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleCampaignDonate(camp, customAmount)}
                          className="flex-1 bg-brand text-on-brand py-2 text-xs font-semibold rounded-xl hover:bg-accent-secondary"
                        >
                          Confirm ₹{customAmount} Contribution
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCampaignId(null)}
                          className="px-3 border border-surface-border text-xs rounded-xl text-copy-secondary hover:bg-bg-subtle"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCampaignId(camp.id)
                        setCustomAmount(500)
                      }}
                      className="w-full bg-brand text-on-brand py-2.5 rounded-xl font-medium text-xs hover:bg-accent-secondary active:scale-[0.99] transition-all shadow-xs"
                    >
                      🛡️ Crowdfund Clearance to Prevent Fire
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 2: General Clean Air NGO Donation */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs">
        <h3 className="text-lg font-semibold text-copy-primary mb-1">Direct NGO Clean Air Fund</h3>
        <p className="text-xs text-copy-secondary mb-4">
          Support verified ground NGOs equipping machinery and providing baler subsidies across North India.
        </p>
        <form onSubmit={handleGeneralDonate} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-copy-secondary mb-1">Select Verified NGO</label>
            <select
              name="ngo_id"
              required
              className="w-full border border-surface-border bg-surface rounded-xl p-2.5 text-sm text-copy-primary focus:ring-2 focus:ring-accent-primary outline-none"
            >
              <option value="">Choose an NGO...</option>
              {ngos.map((n) => (
                <option key={n.profile_id} value={n.profile_id}>
                  {n.profiles?.name || 'Clean Air Trust'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-copy-secondary mb-1">Contribution Amount (₹)</label>
            <input
              name="amount"
              type="number"
              required
              min="100"
              defaultValue="1000"
              className="w-full border border-surface-border bg-surface rounded-xl p-2.5 text-sm text-copy-primary focus:ring-2 focus:ring-accent-primary outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-brand text-on-brand rounded-xl py-2.5 font-medium text-sm hover:bg-accent-secondary transition-colors shadow-xs"
            >
              Donate to Clean Air Fund
            </button>
          </div>
        </form>
      </div>

      {/* Section 3: Wind-Link Air Quality Influence Ranking */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-copy-primary">Wind-Link Trajectory Ranking (NCR Influence)</h3>
        <p className="text-xs text-copy-secondary">
          Villages identified where preventing fires has the highest direct impact on reducing downwind air pollution.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ranked.slice(0, 4).map((r, i) => (
            <div
              key={i}
              className="bg-surface border border-surface-border rounded-xl p-4 flex justify-between items-center shadow-xs"
            >
              <div>
                <p className="font-semibold text-copy-primary text-sm">{r.village?.name || 'Village Area'}</p>
                <p className="text-xs text-copy-secondary mt-0.5">Downwind Exposure Index: {r.influence_score}</p>
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
        <h3 className="text-lg font-semibold text-copy-primary">Your Citizen Impact History</h3>
        {history.length === 0 ? (
          <p className="text-xs text-copy-secondary">No contributions yet. Start by crowdfunded a plot above!</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="bg-surface border border-surface-border rounded-xl p-4 flex justify-between items-center shadow-xs"
              >
                <div>
                  <p className="font-medium text-copy-primary text-sm">
                    Contribution to {h.ngos?.profiles?.name || 'Clean Air Collective'}
                  </p>
                  <p className="text-xs text-copy-secondary mt-0.5">{new Date(h.created_at).toLocaleDateString()}</p>
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
          <h3 className="text-lg font-semibold text-copy-primary">Impact Notifications</h3>
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
