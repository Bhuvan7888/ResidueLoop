import { useState, useEffect } from 'react'
import { getNgoLedger, getNgoRequests, updateRequestStatus, recordDisbursement, getNotifications } from '../api'

export function NgoDashboard({ userId }: { userId: string }) {
  const [ledger, setLedger] = useState({ totalReceived: 0, totalDisbursed: 0, balance: 0 })
  const [requests, setRequests] = useState<{ id: string; status: string; amount_requested: number; purpose: string; farmers?: { profiles?: { name: string } }; listings?: { acres: number } }[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [l, r, notifs] = await Promise.all([
          getNgoLedger(userId),
          getNgoRequests(userId),
          getNotifications(userId)
        ])
        setLedger(l)
        setRequests(r)
        setNotifications(notifs)
      } catch (err) {
        console.error(err)
      }
    }
    loadData()
  }, [userId])

  const handleAction = async (id: string, action: 'approved' | 'declined') => {
    await updateRequestStatus(id, action)
    getNgoRequests(userId).then(setRequests)
  }

  const handleDisbursement = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    await recordDisbursement(id, form.payee_name.value, Number(form.amount.value))
    form.reset()
    Promise.all([getNgoLedger(userId), getNgoRequests(userId)]).then(([l, r]) => {
      setLedger(l)
      setRequests(r)
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-surface-border rounded-xl p-4">
          <p className="text-sm text-copy-secondary">Total Received</p>
          <p className="text-xl font-medium text-state-success">₹{ledger.totalReceived}</p>
        </div>
        <div className="bg-surface border border-surface-border rounded-xl p-4">
          <p className="text-sm text-copy-secondary">Total Disbursed</p>
          <p className="text-xl font-medium text-state-error">₹{ledger.totalDisbursed}</p>
        </div>
        <div className="bg-surface border border-surface-border rounded-xl p-4">
          <p className="text-sm text-copy-secondary">Balance</p>
          <p className="text-xl font-medium text-brand">₹{ledger.balance}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-copy-primary">Assistance Requests</h3>
        {requests.map(req => (
          <div key={req.id} className="bg-surface border border-surface-border rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{req.farmers?.profiles?.name}</p>
                <p className="text-sm text-copy-secondary">{req.listings?.acres} acres, ₹{req.amount_requested} requested</p>
                <p className="text-sm text-copy-secondary mt-1">Purpose: {req.purpose}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs capitalize ${req.status === 'approved' ? 'bg-state-success-dim text-state-success' : req.status === 'declined' ? 'bg-state-error-dim text-state-error' : 'bg-subtle text-copy-muted'}`}>
                {req.status}
              </span>
            </div>

            {req.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => handleAction(req.id, 'approved')} className="px-3 py-1 bg-brand text-on-brand rounded text-sm">Approve</button>
                <button onClick={() => handleAction(req.id, 'declined')} className="px-3 py-1 bg-surface border border-surface-border rounded text-sm">Decline</button>
              </div>
            )}

            {req.status === 'approved' && (
              <form onSubmit={(e) => handleDisbursement(req.id, e)} className="flex gap-2 items-end mt-4 p-3 bg-bg-subtle rounded-lg">
                <div>
                  <label className="text-xs text-copy-secondary block">Payee Name</label>
                  <input name="payee_name" required className="border border-surface-border rounded px-2 py-1 text-sm bg-surface" />
                </div>
                <div>
                  <label className="text-xs text-copy-secondary block">Amount (₹)</label>
                  <input name="amount" type="number" required max={req.amount_requested} className="border border-surface-border rounded px-2 py-1 text-sm bg-surface w-24" />
                </div>
                <button type="submit" className="px-3 py-1 bg-brand text-on-brand rounded text-sm h-[30px]">Record Disburse</button>
              </form>
            )}
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-copy-primary">Notifications</h3>
        {notifications.length === 0 ? (
          <p className="text-sm text-copy-secondary">No new notifications.</p>
        ) : (
          <div className="grid gap-3">
            {notifications.map(n => (
              <div key={n.id} className="bg-surface border border-brand/20 rounded-xl p-4">
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
