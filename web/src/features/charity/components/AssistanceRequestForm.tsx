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
    const selectedNgo = form.ngo_id?.value || (ngos[0] ? ngos[0].profile_id : undefined)
    await requestAssistance({
      ngo_id: selectedNgo,
      listing_id: listingId,
      amount_requested: Number(form.amount.value) || 2500,
      purpose: form.purpose.value || 'Field clearance subsidy to prevent burning'
    })
    onSubmit()
  }

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5 shadow-xs">
      <h3 className="font-semibold text-copy-primary mb-1">Request Charity & Crowdfunded Clearance</h3>
      <p className="text-xs text-copy-secondary mb-4">
        List your field for citizen sponsorship so heavy balers can clear your stubble at zero cost to you.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-copy-secondary mb-1">Partner NGO (Machinery Subsidies)</label>
          <select name="ngo_id" className="w-full border border-surface-border bg-surface rounded-xl p-2.5 text-copy-primary">
            {ngos.length === 0 ? (
              <option value="">Clean Air Action Foundation (Default)</option>
            ) : (
              ngos.map(n => (
                <option key={n.profile_id} value={n.profile_id}>{n.profiles?.name || 'Clean Air Trust'}</option>
              ))
            )}
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
