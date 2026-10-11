import { useTranslation } from 'react-i18next'
import { MessageSquare, CheckCircle2 } from 'lucide-react'

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
  onOpenChat?: (id: string) => void
}

export function OfferCard({ offer, onAccept, onDecline, onOpenChat }: OfferCardProps) {
  const { t } = useTranslation()
  const buyerName = offer.buyers?.org_name || offer.buyer_name || t('matching.default_buyer', 'Industrial Biomass Buyer')
  const balerName = offer.balers?.name || offer.baler_name || t('matching.default_baler', 'Assigned Local Baler')
  const windowStr = offer.pickup_start && offer.pickup_end
    ? `${offer.pickup_start} — ${offer.pickup_end}`
    : t('matching.window_harvest', 'Within 3-5 days of harvest')

  const isAccepted = offer.status === 'accepted'
  // 4-step progress: 1. Offer Received -> 2. Accept & Confirm -> 3. Trolley Dispatch -> 4. Direct Payment
  const currentStep = isAccepted ? 2 : 1

  return (
    <div className={`bg-surface border-2 rounded-3xl p-6 shadow-xs space-y-4 transition-all ${
      isAccepted ? 'border-state-success/40 ring-1 ring-state-success/20' : 'border-surface-border hover:border-brand/40'
    }`}>
      {/* Trust Banner & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand/10 text-brand border border-brand/20 self-start">
          <span>🛡️</span>
          <span>{isAccepted ? t('matching.confirmed_contract', '🤝 Confirmed Match • Verified Buyer') : t('matching.verified_buyer_banner', 'Verified Factory Buyer • Guaranteed Bank Payout')}</span>
        </div>
        <span className={`px-3 py-1 text-xs rounded-full font-bold capitalize self-start sm:self-auto flex items-center gap-1.5 ${
          offer.status === 'accepted' ? 'bg-state-success-dim text-state-success border border-state-success/30' :
          offer.status === 'declined' ? 'bg-state-error-dim text-state-error border border-state-error/30' :
          'bg-amber-100 text-amber-900 border border-amber-200'
        }`}>
          {isAccepted && <CheckCircle2 className="w-3.5 h-3.5" />}
          <span>{t(`status.${offer.status}`, offer.status)}</span>
        </span>
      </div>

      {/* Main Rate Display */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-baseline gap-1 border-b border-surface-border-subtle pb-3">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-copy-muted block">
            {t('farmer.agreed_rate_label', 'Fair Rate')}:
          </span>
          <div className="text-2xl sm:text-3xl font-black text-state-success mt-0.5">
            ₹{offer.price_per_tonne.toLocaleString('en-IN')}
            <span className="text-sm font-semibold text-copy-secondary ml-1">
              /{t('listing.tonnes', 'tonne')}
            </span>
          </div>
        </div>
        <span className="text-xs text-copy-secondary font-medium">
          🌾 {t('matching.free_pickup_guarantee', 'Free loading & trolley transport directly from your field.')}
        </span>
      </div>

      {/* 4-Step Timeline Progress Bar */}
      <div className="bg-bg-subtle/70 rounded-2xl p-4 border border-surface-border-subtle space-y-2.5">
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold gap-1">
          <div className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-brand' : 'text-copy-muted'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep > 1 ? 'bg-brand text-on-brand' : 'bg-brand text-on-brand ring-2 ring-brand/30'
            }`}>
              {currentStep > 1 ? '✓' : '1'}
            </span>
            <span className="truncate">{t('matching.offer_step_received', 'Offer Received')}</span>
          </div>

          <div className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-brand' : 'text-copy-muted'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep >= 2 ? 'bg-brand text-on-brand ring-2 ring-brand/30' : 'bg-surface border border-surface-border'
            }`}>
              {currentStep > 2 ? '✓' : '2'}
            </span>
            <span className="truncate">{t('matching.offer_step_accept', 'Accept & Confirm')}</span>
          </div>

          <div className="flex items-center gap-1.5 text-copy-muted">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-surface border border-surface-border">
              3
            </span>
            <span className="truncate">{t('matching.offer_step_trolley', 'Trolley Dispatch')}</span>
          </div>

          <div className="flex items-center gap-1.5 text-copy-muted">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-surface border border-surface-border">
              4
            </span>
            <span className="truncate">{t('matching.offer_step_payment', 'Direct Payment')}</span>
          </div>
        </div>

        {/* Progress track line */}
        <div className="w-full bg-surface-border-subtle rounded-full h-2 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 bg-brand"
            style={{ width: currentStep === 1 ? '25%' : currentStep === 2 ? '50%' : '100%' }}
          />
        </div>
      </div>

      {/* Everyday Friendly Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-bg-subtle/50 p-3 rounded-2xl border border-surface-border/40">
          <span className="text-[10px] uppercase font-bold tracking-wider text-copy-muted block">
            🏭 {t('matching.buyer', 'Buyer')}
          </span>
          <strong className="text-copy-primary text-sm mt-1 block truncate">
            {buyerName}
          </strong>
        </div>

        <div className="bg-bg-subtle/50 p-3 rounded-2xl border border-surface-border/40">
          <span className="text-[10px] uppercase font-bold tracking-wider text-copy-muted block">
            🚜 {t('matching.baler', 'Assigned Baler / Truck')}
          </span>
          <strong className="text-copy-primary text-sm mt-1 block truncate">
            {balerName}
          </strong>
        </div>

        <div className="bg-bg-subtle/50 p-3 rounded-2xl border border-surface-border/40">
          <span className="text-[10px] uppercase font-bold tracking-wider text-copy-muted block">
            🗓️ {t('matching.window', 'Trolley Arrival')}
          </span>
          <strong className="text-copy-primary text-sm mt-1 block truncate">
            {windowStr}
          </strong>
        </div>
      </div>
      
      {/* Action Buttons */}
      {offer.status === 'pending' && (
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onDecline(offer.id)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border-2 border-surface-border text-copy-secondary hover:bg-bg-subtle text-xs font-bold transition-colors cursor-pointer order-2 sm:order-1"
          >
            ✕ {t('matching.decline_offer_cta', 'Not Right Now')}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onAccept(offer.id)
              onOpenChat?.(offer.id)
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-brand text-on-brand hover:bg-accent-secondary text-sm font-extrabold shadow-md transition-all hover:scale-[1.01] cursor-pointer order-1 sm:order-2 flex items-center justify-center gap-2"
          >
            <span>✅</span>
            <span>{t('matching.accept_offer_cta', 'Accept Offer & Confirm Pickup')}</span>
          </button>
        </div>
      )}

      {isAccepted && (
        <div className="flex justify-between items-center pt-2 border-t border-surface-border/40 flex-wrap gap-2">
          <p className="text-xs text-state-success font-medium flex items-center gap-1.5">
            <span>🎉</span>
            <span>{t('matching.accepted_notice', 'Deal accepted! Direct coordination active.')}</span>
          </p>
          {onOpenChat && (
            <button
              type="button"
              onClick={() => onOpenChat(offer.id)}
              className="px-4 py-2 rounded-xl bg-brand text-on-brand hover:bg-accent-secondary text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('deal_chat.open_chat_button', 'Chat with Buyer & Details')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
