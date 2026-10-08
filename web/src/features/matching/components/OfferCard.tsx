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

import { useTranslation } from 'react-i18next'

export function OfferCard({ offer, onAccept, onDecline }: OfferCardProps) {
  const { t } = useTranslation()
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-copy-primary">{t('matching.offer_price', { price: offer.price_per_tonne })}</p>
        <p className="text-xs text-copy-secondary">{t('matching.status', 'Status')}: {t(`status.${offer.status}`, offer.status)}</p>
      </div>
      
      {offer.status === 'pending' && (
        <div className="flex space-x-2">
          <button
            onClick={() => onDecline(offer.id)}
            className="px-3 py-1 rounded-lg border border-surface-border text-copy-secondary hover:bg-bg-subtle text-sm"
          >
            {t('common.decline', 'Decline')}
          </button>
          <button
            onClick={() => onAccept(offer.id)}
            className="px-3 py-1 rounded-lg bg-brand text-on-brand hover:bg-accent-secondary text-sm"
          >
            {t('common.accept', 'Accept')}
          </button>
        </div>
      )}
    </div>
  )
}
