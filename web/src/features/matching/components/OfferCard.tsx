interface Offer {
  id: string
  status: string
  price_per_tonne: number
}

interface OfferCardProps {
  offer: Offer
  onAccept: (id: string) => Promise<void>
  onDecline: (id: string) => Promise<void>
}

export function OfferCard({ offer, onAccept, onDecline }: OfferCardProps) {
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-copy-primary">Offer: ₹{offer.price_per_tonne} / tonne</p>
        <p className="text-xs text-copy-secondary">Status: {offer.status}</p>
      </div>
      
      {offer.status === 'pending' && (
        <div className="flex space-x-2">
          <button
            onClick={() => onDecline(offer.id)}
            className="px-3 py-1 rounded-lg border border-surface-border text-copy-secondary hover:bg-bg-subtle text-sm"
          >
            Decline
          </button>
          <button
            onClick={() => onAccept(offer.id)}
            className="px-3 py-1 rounded-lg bg-brand text-on-brand hover:bg-accent-secondary text-sm"
          >
            Accept
          </button>
        </div>
      )}
    </div>
  )
}
