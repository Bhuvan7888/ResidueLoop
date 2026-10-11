import { useState, useEffect, useCallback } from 'react'
import {
  getNgoLedger,
  getNgoRequests,
  updateRequestStatus,
  recordDisbursement,
  getNotifications,
  getNgoDisbursements,
  getNgoDonations,
} from '../api'

interface AssistanceRequest {
  id: string
  status: string
  amount_requested: number
  purpose: string
  farmers?: { profiles?: { name: string } }
  listings?: { acres: number }
}

interface DisbursementItem {
  id: string
  payee_name: string
  payee_type?: string
  amount: number
  note?: string
  created_at: string
  assistance_requests?: { purpose: string; farmers?: { profiles?: { name: string } } }
}

interface DonationItem {
  id: string
  amount: number
  created_at: string
  donor?: { name: string }
  villages?: { name: string }
}

export function NgoDashboard({ userId }: { userId: string }) {
  const [ledger, setLedger] = useState({ totalReceived: 0, totalDisbursed: 0, balance: 0 })
  const [requests, setRequests] = useState<AssistanceRequest[]>([])
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([])
  const [donations, setDonations] = useState<DonationItem[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])
  const [activeLedgerTab, setActiveLedgerTab] = useState<'disbursements' | 'donations'>('disbursements')
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [l, r, notifs, disb, don] = await Promise.all([
        getNgoLedger(userId),
        getNgoRequests(userId),
        getNotifications(userId),
        getNgoDisbursements(userId).catch(() => []),
        getNgoDonations(userId).catch(() => []),
      ])
      setLedger(l)
      setRequests((r as unknown as AssistanceRequest[]) || [])
      setNotifications(notifs)
      setDisbursements((disb as unknown as DisbursementItem[]) || [])
      setDonations((don as unknown as DonationItem[]) || [])
    } catch (err) {
      console.error(err)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAction = async (id: string, action: 'approved' | 'declined') => {
    try {
      await updateRequestStatus(id, action)
      setActionMsg(`Request ${action === 'approved' ? 'approved' : 'declined'} successfully.`)
      loadData()
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Action failed')
    }
  }

  const handleDisbursement = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const payeeName = form.payee_name.value
    const amount = Number(form.amount.value)
    const payeeType = (form.payee_type.value || 'baler') as 'baler' | 'transport provider' | 'farmer'
    const note = form.note.value

    try {
      await recordDisbursement(id, payeeName, amount, payeeType, note)
      setActionMsg(`Disbursement of ₹${amount.toLocaleString()} to ${payeeName} recorded successfully!`)
      form.reset()
      loadData()
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Disbursement failed')
    }
  }

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div className="rounded-xl bg-state-success-dim border border-state-success/30 p-4 text-sm text-state-success flex items-center justify-between">
          <p className="font-medium">{actionMsg}</p>
          <button
            onClick={() => setActionMsg(null)}
            className="text-xs uppercase font-semibold opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium text-copy-secondary">Total Received (Inflow)</p>
          <p className="text-2xl font-bold text-state-success mt-1">₹{ledger.totalReceived.toLocaleString()}</p>
          <p className="text-[11px] text-copy-muted mt-1">Citizen & Corporate Clean Air donations</p>
        </div>
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium text-copy-secondary">Total Disbursed (Outflow)</p>
          <p className="text-2xl font-bold text-state-error mt-1">₹{ledger.totalDisbursed.toLocaleString()}</p>
          <p className="text-[11px] text-copy-muted mt-1">Direct to balers, transport & farmers</p>
        </div>
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium text-copy-secondary">Available Working Fund</p>
          <p className="text-2xl font-bold text-brand mt-1">₹{ledger.balance.toLocaleString()}</p>
          <p className="text-[11px] text-copy-muted mt-1">Ready for immediate field clearance</p>
        </div>
      </div>

      {/* Assistance Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-copy-primary">Field Clearance Assistance Requests</h3>
          <span className="text-xs text-copy-secondary">
            {requests.filter((r) => r.status === 'pending').length} Pending Review
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="bg-surface border border-surface-border rounded-2xl p-6 text-center text-copy-secondary text-sm">
            No assistance requests found.
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-copy-primary">{req.farmers?.profiles?.name || 'Local Farmer'}</p>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        req.status === 'approved'
                          ? 'bg-state-success-dim text-state-success'
                          : req.status === 'declined'
                          ? 'bg-state-error-dim text-state-error'
                          : 'bg-bg-subtle text-copy-secondary'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-copy-secondary mt-1">
                    {req.listings?.acres ? `${req.listings.acres} Acres • ` : ''}
                    Goal: <strong className="text-copy-primary">₹{req.amount_requested.toLocaleString()}</strong>
                  </p>
                  <p className="text-xs text-copy-secondary mt-1">
                    Purpose: <span className="text-copy-primary">{req.purpose}</span>
                  </p>
                </div>
              </div>

              {req.status === 'pending' && (
                <div className="flex gap-2 pt-2 border-t border-surface-border">
                  <button
                    onClick={() => handleAction(req.id, 'approved')}
                    className="px-4 py-2 bg-brand text-on-brand rounded-xl text-xs font-semibold hover:bg-accent-secondary transition-colors"
                  >
                    ✓ Approve for Clearance
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'declined')}
                    className="px-4 py-2 bg-surface border border-surface-border text-copy-secondary rounded-xl text-xs font-semibold hover:bg-bg-subtle transition-colors"
                  >
                    ✕ Decline
                  </button>
                </div>
              )}

              {req.status === 'approved' && (
                <form
                  onSubmit={(e) => handleDisbursement(req.id, e)}
                  className="space-y-3 pt-3 border-t border-surface-border bg-bg-subtle/50 p-4 rounded-xl"
                >
                  <p className="text-xs font-semibold text-copy-primary">Record Clean Clearance Disbursement</p>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className="text-[11px] text-copy-secondary block mb-1">Payee Type</label>
                      <select
                        name="payee_type"
                        defaultValue="baler"
                        className="w-full border border-surface-border rounded-xl px-2.5 py-2 text-xs bg-surface text-copy-primary outline-none focus:ring-2 focus:ring-accent-primary"
                      >
                        <option value="baler">Baler / Machinery Operator</option>
                        <option value="transport provider">Transport / Hauler</option>
                        <option value="farmer">Farmer Direct Incentive</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-copy-secondary block mb-1">Payee Name</label>
                      <input
                        name="payee_name"
                        required
                        placeholder="e.g. Majha Custom Hiring Centre"
                        className="w-full border border-surface-border rounded-xl px-2.5 py-2 text-xs bg-surface text-copy-primary outline-none focus:ring-2 focus:ring-accent-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-copy-secondary block mb-1">Amount (₹)</label>
                      <input
                        name="amount"
                        type="number"
                        required
                        max={req.amount_requested}
                        defaultValue={req.amount_requested}
                        className="w-full border border-surface-border rounded-xl px-2.5 py-2 text-xs bg-surface text-copy-primary outline-none focus:ring-2 focus:ring-accent-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-copy-secondary block mb-1">Notes / Verification Ref</label>
                      <input
                        name="note"
                        placeholder="e.g. Field baled without burning"
                        className="w-full border border-surface-border rounded-xl px-2.5 py-2 text-xs bg-surface text-copy-primary outline-none focus:ring-2 focus:ring-accent-primary"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-brand text-on-brand rounded-xl text-xs font-semibold hover:bg-accent-secondary transition-colors"
                    >
                      Record Disbursement
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))
        )}
      </div>

      {/* Section: Interactive Transaction Ledger */}
      <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-copy-primary">Auditable Transaction Ledger</h3>
            <p className="text-xs text-copy-secondary">
              Real-time transparent audit record linking citizen donations to field clearance disbursements.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveLedgerTab('disbursements')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeLedgerTab === 'disbursements'
                  ? 'bg-brand text-on-brand'
                  : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
              }`}
            >
              Disbursements ({disbursements.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveLedgerTab('donations')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeLedgerTab === 'donations'
                  ? 'bg-brand text-on-brand'
                  : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
              }`}
            >
              Donations Inflow ({donations.length})
            </button>
          </div>
        </div>

        {activeLedgerTab === 'disbursements' ? (
          disbursements.length === 0 ? (
            <div className="p-6 text-center text-copy-secondary text-xs">
              No disbursements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-border text-copy-secondary">
                    <th className="pb-2.5 font-medium">Date</th>
                    <th className="pb-2.5 font-medium">Payee</th>
                    <th className="pb-2.5 font-medium">Type</th>
                    <th className="pb-2.5 font-medium">Notes / Purpose</th>
                    <th className="pb-2.5 font-medium text-right">Amount</th>
                    <th className="pb-2.5 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {disbursements.map((d) => (
                    <tr key={d.id} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="py-2.5 text-copy-secondary">
                        {new Date(d.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 font-medium text-copy-primary">{d.payee_name}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-bg-subtle text-copy-primary font-medium capitalize">
                          {d.payee_type || 'baler'}
                        </span>
                      </td>
                      <td className="py-2.5 text-copy-secondary max-w-xs truncate">
                        {d.note || d.assistance_requests?.purpose || 'Stubble Clearance'}
                      </td>
                      <td className="py-2.5 text-right font-bold text-state-error">
                        -₹{d.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-state-success-dim text-state-success">
                          ✓ Settled
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          donations.length === 0 ? (
            <div className="p-6 text-center text-copy-secondary text-xs">
              No donations received yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-border text-copy-secondary">
                    <th className="pb-2.5 font-medium">Date</th>
                    <th className="pb-2.5 font-medium">Donor / Source</th>
                    <th className="pb-2.5 font-medium">Target Village</th>
                    <th className="pb-2.5 font-medium text-right">Amount</th>
                    <th className="pb-2.5 font-medium text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {donations.map((don) => (
                    <tr key={don.id} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="py-2.5 text-copy-secondary">
                        {new Date(don.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 font-medium text-copy-primary">
                        {don.donor?.name || 'Anonymous Citizen'}
                      </td>
                      <td className="py-2.5 text-copy-secondary">
                        {don.villages?.name || 'General Clean Air Pool'}
                      </td>
                      <td className="py-2.5 text-right font-bold text-state-success">
                        +₹{don.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-state-success-dim text-state-success">
                          Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Notifications Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-copy-primary">Activity Notifications</h3>
        {notifications.length === 0 ? (
          <p className="text-xs text-copy-secondary">No new notifications.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {notifications.map((n) => (
              <div key={n.id} className="bg-surface border border-brand/20 rounded-xl p-4 shadow-xs">
                <p className="text-sm text-copy-primary">{n.message}</p>
                <p className="text-xs text-copy-secondary mt-2">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
