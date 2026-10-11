interface Offer {
  id: string
  status: string
  price_per_tonne: number
  pickup_start?: string | null
  pickup_end?: string | null
  buyers?: { org_name?: string }
  balers?: { name?: string }
  buyer_name?: string
  baler_name?: string
}

interface OfferCardProps {
  offer: Offer
  onAccept: (id: string) => Promise<void>
  onDecline: (id: string) => Promise<void>
}

import { useTranslation } from 'react-i18next'

export function OfferCard({ offer, onAccept, onDecline }: OfferCardProps) {
  const { t } = useTranslation()
  const buyerName = offer.buyers?.org_name || offer.buyer_name || t('matching.default_buyer', 'Industrial Biomass Buyer')
  const balerName = offer.balers?.name || offer.baler_name || t('matching.default_baler', 'Assigned Local Baler')
  const windowStr = offer.pickup_start && offer.pickup_end
    ? `${offer.pickup_start} — ${offer.pickup_end}`
    : t('matching.window_harvest', 'Within 3-5 days of harvest')

  return (
    <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full">
            {t('matching.verified_offer', 'Verified Offer')}
          </span>
          <h4 className="text-lg font-bold text-copy-primary mt-1">
            {t('matching.offer_price', { price: offer.price_per_tonne })}
          </h4>
        </div>
        <span className={`px-2.5 py-1 text-xs rounded-full font-medium capitalize self-start sm:self-auto ${
          offer.status === 'accepted' ? 'bg-state-success-dim text-state-success' :
          offer.status === 'declined' ? 'bg-state-error-dim text-state-error' :
          'bg-amber-100 text-amber-900'
        }`}>
          {t(`status.${offer.status}`, offer.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-copy-secondary">
        <div className="bg-bg-subtle/50 p-2.5 rounded-xl border border-surface-border/40">
          <span className="text-copy-muted block">{t('matching.buyer', 'Buyer')}:</span>
          <strong className="text-copy-primary text-sm mt-0.5 block truncate">{buyerName}</strong>
        </div>
        <div className="bg-bg-subtle/50 p-2.5 rounded-xl border border-surface-border/40">
          <span className="text-copy-muted block">{t('matching.baler', 'Baler')}:</span>
          <strong className="text-copy-primary text-sm mt-0.5 block truncate">{balerName}</strong>
        </div>
        <div className="bg-bg-subtle/50 p-2.5 rounded-xl border border-surface-border/40">
          <span className="text-copy-muted block">{t('matching.window', 'Pickup Window')}:</span>
          <strong className="text-copy-primary text-sm mt-0.5 block">{windowStr}</strong>
        </div>
      </div>
      
      {offer.status === 'pending' && (
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => onDecline(offer.id)}
            className="px-4 py-2 rounded-xl border border-surface-border text-copy-secondary hover:bg-bg-subtle text-xs font-semibold transition-colors"
          >
            {t('common.decline', 'Decline')}
          </button>
          <button
            type="button"
            onClick={() => onAccept(offer.id)}
            className="px-5 py-2 rounded-xl bg-brand text-on-brand hover:bg-accent-secondary text-xs font-semibold shadow-xs transition-colors"
          >
            {t('matching.accept_pool', 'Accept & Join Pool')}
          </button>
        </div>
      )}
    </div>
  )
}

