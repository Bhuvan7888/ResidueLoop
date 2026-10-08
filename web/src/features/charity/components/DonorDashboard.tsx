import { useState, useEffect } from 'react'
import { getDonorHistory, getNGOs, createDonation, getRankedVillages, getNotifications } from '../api'

export function DonorDashboard({ userId }: { userId: string }) {
  const [history, setHistory] = useState<{ id: string; amount: number; created_at: string; ngos?: { profiles?: { name: string } } }[]>([])
  const [ngos, setNgos] = useState<{ profile_id: string; profiles?: { name: string } }[]>([])
  const [ranked, setRanked] = useState<{ influence_score: number; label: string; village?: { name: string } }[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [h, n, r, notifs] = await Promise.all([
          getDonorHistory(userId),
          getNGOs(),
          getRankedVillages('Delhi'),
          getNotifications(userId)
        ])
        setHistory(h)
        setNgos(n)
        setRanked(r)
        setNotifications(notifs)
      } catch (err) {
        console.error(err)
      }
    }
    loadData()
  }, [userId])

  const handleDonate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    await createDonation({
      ngo_id: form.ngo_id.value,
      amount: Number(form.amount.value)
    })
    form.reset()
    // Re-fetch history
    getDonorHistory(userId).then(setHistory)
  }

  return (
    <div className="space-y-6">
      
      <div className="bg-surface border border-surface-border rounded-xl p-5">
        <h3 className="text-lg font-medium text-copy-primary mb-4">Make a Donation (Test Mode)</h3>
        <form onSubmit={handleDonate} className="space-y-4">
          <div>
            <label className="block text-sm text-copy-secondary mb-1">Select NGO</label>
            <select name="ngo_id" required className="w-full border border-surface-border bg-surface rounded-lg p-2 text-copy-primary">
              <option value="">Choose an NGO</option>
              {ngos.map(n => (
                <option key={n.profile_id} value={n.profile_id}>{n.profiles?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-copy-secondary mb-1">Amount (₹)</label>
            <input name="amount" type="number" required min="1" className="w-full border border-surface-border bg-surface rounded-lg p-2 text-copy-primary" />
          </div>
          <button type="submit" className="w-full bg-brand text-on-brand rounded-lg py-2 font-medium">Donate</button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-copy-primary">Wind-Link Ranking (Delhi)</h3>
        <div className="grid gap-3">
          {ranked.map((r, i) => (
            <div key={i} className="bg-surface border border-surface-border rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-copy-primary">{r.village?.name}</p>
                <p className="text-sm text-copy-secondary">Influence Score: {r.influence_score}</p>
              </div>
              <span className="bg-state-warning-dim text-state-warning text-xs px-2 py-1 rounded">{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-copy-primary">Your Impact History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-copy-secondary">No donations yet.</p>
        ) : (
          <div className="grid gap-3">
            {history.map(h => (
              <div key={h.id} className="bg-bg-subtle rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-copy-primary">To {h.ngos?.profiles?.name}</p>
                  <p className="text-sm text-copy-secondary">{new Date(h.created_at).toLocaleDateString()}</p>
                </div>
                <p className="font-medium text-brand">₹{h.amount}</p>
              </div>
            ))}
          </div>
        )}
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
