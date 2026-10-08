import { useState, useEffect } from 'react'
import { requestAssistance, getNGOs } from '../api'

interface Props {
  listingId: string
  onSubmit: () => void
  onCancel: () => void
}

export function AssistanceRequestForm({ listingId, onSubmit, onCancel }: Props) {
  const [ngos, setNgos] = useState<{ profile_id: string; profiles?: { name: string } }[]>([])

  useEffect(() => {
    getNGOs().then(setNgos).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    await requestAssistance({
      ngo_id: form.ngo_id.value,
      listing_id: listingId,
      amount_requested: Number(form.amount.value),
      purpose: form.purpose.value
    })
    onSubmit()
  }

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5">
      <h3 className="font-medium text-copy-primary mb-4">Request Assistance</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block text-sm text-copy-secondary mb-1">Amount Needed (₹)</label>
          <input name="amount" type="number" required min="1" className="w-full border border-surface-border bg-surface rounded-lg p-2 text-copy-primary" />
        </div>
        <div>
          <label className="block text-sm text-copy-secondary mb-1">Purpose</label>
          <input name="purpose" type="text" placeholder="e.g. For baler rental" required className="w-full border border-surface-border bg-surface rounded-lg p-2 text-copy-primary" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-brand text-on-brand rounded-lg py-2 font-medium">Submit Request</button>
          <button type="button" onClick={onCancel} className="flex-1 bg-surface border border-surface-border rounded-lg py-2 font-medium text-copy-primary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
