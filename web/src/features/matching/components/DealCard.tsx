import { useTranslation } from 'react-i18next'
import { MessageSquare, Phone, MapPin, CheckCircle2 } from 'lucide-react'
import type { MatchedDeal } from '../api'

interface DealCardProps {
  deal: MatchedDeal
  userRole: 'farmer' | 'buyer'
  onOpenChat: (offerId: string) => void
}

export function DealCard({ deal, userRole, onOpenChat }: DealCardProps) {
  const { t } = useTranslation()
  const isFarmer = userRole === 'farmer'

  const counterpartyName = isFarmer
    ? deal.buyer.org_name || deal.buyer.contact_name || t('deal_chat.buyer_org', 'Biomass Procurement Buyer')
    : deal.farmer.name || t('deal_chat.farmer_name', 'Local Farmer')

  const counterpartyPhone = isFarmer ? deal.buyer.phone : deal.farmer.phone
  const locationStr = isFarmer
    ? deal.farmer.village_name ? `${deal.farmer.village_name}, ${deal.farmer.district || ''}` : 'Punjab'
    : `${deal.farmer.village_name || 'Punjab'}, ${deal.farmer.district || ''}`

  return (
    <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-3.5 hover:border-brand/40 transition-all">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{isFarmer ? '🏭' : '🌾'}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-copy-primary text-base sm:text-lg">
                {counterpartyName}
              </h4>
              <span className="px-2 py-0.5 text-[11px] rounded-full font-bold bg-state-success-dim text-state-success border border-state-success/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{t('status.accepted', 'Deal Accepted')}</span>
              </span>
            </div>
            <p className="text-xs text-copy-secondary flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-copy-muted" />
              <span>{locationStr}</span>
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[11px] uppercase font-bold text-copy-muted block">{t('deal_chat.total_amount', 'Contract Value')}</span>
          <strong className="text-lg font-bold text-state-success">
            ₹{deal.total_amount.toLocaleString()}
          </strong>
        </div>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-bg-subtle/50 p-2.5 rounded-xl border border-surface-border/40">
          <span className="text-copy-muted block text-[10px] uppercase font-bold">{t('deal_chat.rate', 'Agreed Rate')}</span>
          <strong className="text-copy-primary text-xs mt-0.5 block font-bold">
            ₹{deal.price_per_tonne.toLocaleString()}/t
          </strong>
        </div>
        <div className="bg-bg-subtle/50 p-2.5 rounded-xl border border-surface-border/40">
          <span className="text-copy-muted block text-[10px] uppercase font-bold">{t('deal_chat.quantity', 'Load Quantity')}</span>
          <strong className="text-copy-primary text-xs mt-0.5 block font-bold">
            {deal.est_tonnes} {t('common.tonne', 'Tonnes')}
          </strong>
        </div>
        <div className="bg-bg-subtle/50 p-2.5 rounded-xl border border-surface-border/40">
          <span className="text-copy-muted block text-[10px] uppercase font-bold">{t('deal_chat.pickup_window', 'Pickup Window')}</span>
          <strong className="text-copy-primary text-xs mt-0.5 block truncate">
            {deal.pickup_start || 'Immediate'}
          </strong>
        </div>
        <div className="bg-bg-subtle/50 p-2.5 rounded-xl border border-surface-border/40">
          <span className="text-copy-muted block text-[10px] uppercase font-bold">{t('deal_chat.baler_team', 'Baler Team')}</span>
          <strong className="text-copy-primary text-xs mt-0.5 block truncate">
            {deal.baler.name || 'Assigned Logistics'}
          </strong>
        </div>
      </div>

      {/* Latest Message Preview if any */}
      {deal.last_message && (
        <div className="p-2.5 rounded-xl bg-brand/5 border border-brand/10 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="text-brand text-sm">💬</span>
            <span className="text-copy-secondary truncate italic">
              "{deal.last_message}"
            </span>
          </div>
          {deal.last_message_at && (
            <span className="text-[10px] text-copy-muted shrink-0">
              {new Date(deal.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
        {counterpartyPhone ? (
          <a
            href={`tel:${counterpartyPhone}`}
            className="px-3 py-2 rounded-xl border border-surface-border bg-bg-subtle hover:bg-surface-border text-xs font-semibold text-copy-primary flex items-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-brand" />
            <span>{counterpartyPhone}</span>
          </a>
        ) : <div />}

        <button
          type="button"
          onClick={() => onOpenChat(deal.offer_id)}
          className="px-4 py-2 rounded-xl bg-brand text-on-brand hover:bg-accent-secondary text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{t('deal_chat.open_chat_contract', 'Open Chat & Details')}</span>
        </button>
      </div>
    </div>
  )
}
