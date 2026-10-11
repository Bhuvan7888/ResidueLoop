import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Send,
  Phone,
  Truck,
  CheckCircle2,
  MessageSquare,
  FileText,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import {
  type MatchedDeal,
  type DealMessage,
  getSingleDeal,
  getDealMessages,
  sendDealMessage,
} from '../api'

interface DealChatModalProps {
  offerId: string
  initialDeal?: MatchedDeal | null
  currentUserRole: 'farmer' | 'buyer'
  currentUserId?: string
  currentUserName?: string
  onClose: () => void
}

export function DealChatModal({
  offerId,
  initialDeal,
  currentUserRole,
  currentUserId,
  currentUserName,
  onClose,
}: DealChatModalProps) {
  const { t } = useTranslation()
  const [deal, setDeal] = useState<MatchedDeal | null>(initialDeal || null)
  const [messages, setMessages] = useState<DealMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'details' | 'logistics'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isFarmer = currentUserRole === 'farmer'

  // Counterparty info
  const counterpartyName = isFarmer
    ? deal?.buyer?.org_name || deal?.buyer?.contact_name || t('deal_chat.buyer_org', 'Biomass Procurement Buyer')
    : deal?.farmer?.name || t('deal_chat.farmer_name', 'Farmer')

  const counterpartyPhone = isFarmer
    ? deal?.buyer?.phone || '+919876543210'
    : deal?.farmer?.phone || '+919999900001'

  const counterpartySubtitle = isFarmer
    ? `${deal?.buyer?.type ? deal.buyer.type.toUpperCase() + ' • ' : ''}${t('deal_chat.verified_buyer', 'Verified Industrial Buyer')}`
    : `${deal?.farmer?.village_name || 'Punjab'}, ${deal?.farmer?.district || ''} • ${t('deal_chat.verified_farmer', 'Verified Farmer')}`

  // Fetch deal data
  const loadDeal = useCallback(async () => {
    try {
      const data = await getSingleDeal(offerId)
      setDeal(data)
    } catch (err) {
      console.error('Failed to load deal details:', err)
    }
  }, [offerId])

  // Fetch messages
  const loadMessages = useCallback(async () => {
    try {
      const msgs = await getDealMessages(offerId)
      setMessages(msgs)
    } catch (err) {
      console.error('Failed to load chat messages:', err)
    }
  }, [offerId])

  useEffect(() => {
    loadDeal()
    loadMessages()
    const timer = setInterval(loadMessages, 3000)
    return () => clearInterval(timer)
  }, [loadDeal, loadMessages])

  // Auto-scroll when messages change or chat tab opens
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  // Send message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim()
    if (!textToSend || sending) return

    setSending(true)
    if (!customText) setInputText('')

    // Optimistic message append
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: DealMessage = {
      id: tempId,
      offer_id: offerId,
      sender_id: currentUserId,
      sender_role: currentUserRole,
      sender_name: currentUserName || (isFarmer ? t('deal_chat.farmer', 'Farmer') : t('deal_chat.buyer', 'Buyer')),
      text: textToSend,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const created = await sendDealMessage(offerId, {
        message: textToSend,
        sender_id: currentUserId,
        sender_role: currentUserRole,
        sender_name: currentUserName,
      })
      setMessages((prev) => prev.map((m) => (m.id === tempId ? created : m)))
    } catch (err) {
      console.error('Failed to send message:', err)
      // Rollback optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      alert(err instanceof Error ? err.message : t('deal_chat.send_failed', 'Failed to send message'))
    } finally {
      setSending(false)
    }
  }

  // Quick reply coordination chips
  const farmerChips = [
    t('deal_chat.farmer_chip_1', '🚜 When will the baler team arrive at my field?'),
    t('deal_chat.farmer_chip_2', '🌾 Field is clear, north gate tractor path is open.'),
    t('deal_chat.farmer_chip_3', '📍 Please tell the driver to call me upon reaching village.'),
    t('deal_chat.farmer_chip_4', '📄 Straw loaded on trolley, please confirm weight slip & payout.'),
  ]

  const buyerChips = [
    t('deal_chat.buyer_chip_1', '🚛 Baler logistics team is dispatched and will reach tomorrow morning.'),
    t('deal_chat.buyer_chip_2', '⏳ Please ensure field is dry and tractor gate is unlocked.'),
    t('deal_chat.buyer_chip_3', '⚖️ Weighbridge slip received! Bank payout is initiated.'),
    t('deal_chat.buyer_chip_4', '✅ Paddy straw delivered to plant. Thank you for clean supply!'),
  ]

  const quickChips = isFarmer ? farmerChips : buyerChips

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface border border-surface-border rounded-3xl shadow-2xl w-full max-w-4xl h-[92vh] max-h-[820px] flex flex-col overflow-hidden text-copy-primary">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-surface-border bg-surface flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-2xl shrink-0">
              {isFarmer ? '🏭' : '🌾'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-copy-primary truncate">
                  {counterpartyName}
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-state-success-dim text-state-success border border-state-success/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-pulse"></span>
                  {t('deal_chat.match_accepted', 'Matched & Accepted')}
                </span>
              </div>
              <p className="text-xs text-copy-secondary truncate mt-0.5">
                {counterpartySubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {counterpartyPhone && (
              <a
                href={`tel:${counterpartyPhone}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-subtle hover:bg-surface-border text-xs font-semibold text-copy-primary border border-surface-border transition-colors"
                title={t('deal_chat.call', 'Call Counterparty')}
              >
                <Phone className="w-3.5 h-3.5 text-brand" />
                <span>{counterpartyPhone}</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-copy-secondary hover:text-copy-primary hover:bg-bg-subtle transition-colors cursor-pointer"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-surface-border bg-bg-subtle/40 px-4 sm:px-6 shrink-0 gap-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'border-brand text-brand'
                : 'border-transparent text-copy-secondary hover:text-copy-primary'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t('deal_chat.tab_chat', 'Direct Chat')}</span>
            {messages.length > 0 && (
              <span className="text-[10px] bg-brand/15 text-brand px-1.5 py-0.2 rounded-full font-bold">
                {messages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'border-brand text-brand'
                : 'border-transparent text-copy-secondary hover:text-copy-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t('deal_chat.tab_details', 'Contract & Field Details')}</span>
          </button>
          <button
            onClick={() => setActiveTab('logistics')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'logistics'
                ? 'border-brand text-brand'
                : 'border-transparent text-copy-secondary hover:text-copy-primary'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{t('deal_chat.tab_logistics', 'Logistics & Baler')}</span>
          </button>
        </div>

        {/* Tab 1: Direct Chat */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-bg-canvas/50">
            {/* Quick Deal Summary Strip */}
            <div className="px-4 py-2.5 bg-brand/5 border-b border-brand/10 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-copy-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  <span>
                    {deal ? `${deal.est_tonnes}t @ ₹${deal.price_per_tonne.toLocaleString()}/t` : 'Loading contract...'}
                  </span>
                </span>
                <span className="text-copy-muted">•</span>
                <span className="font-medium text-state-success">
                  {t('deal_chat.total_payout', 'Total Value:')} ₹{deal ? deal.total_amount.toLocaleString() : '—'}
                </span>
                <span className="text-copy-muted">•</span>
                <span className="text-copy-secondary">
                  {t('deal_chat.pickup_window', 'Pickup:')} {deal?.pickup_start || 'Within 48h'} — {deal?.pickup_end || '5 days'}
                </span>
              </div>
              {counterpartyPhone && (
                <a
                  href={`tel:${counterpartyPhone}`}
                  className="sm:hidden text-brand font-semibold hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Phone className="w-3 h-3" />
                  <span>{t('deal_chat.call', 'Call')}</span>
                </a>
              )}
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              {messages.map((m) => {
                const isSystem = m.sender_role === 'system'
                const isMe = m.sender_role === currentUserRole

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center my-2">
                      <div className="bg-surface border border-brand/20 text-copy-primary text-xs px-4 py-2 rounded-2xl max-w-lg text-center shadow-xs space-y-1">
                        <div className="font-semibold text-brand text-[11px] uppercase tracking-wider flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{m.sender_name}</span>
                        </div>
                        <p className="text-copy-secondary leading-relaxed">{m.text}</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] sm:max-w-md ${
                      isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-bold text-copy-secondary">
                        {m.sender_name || (isMe ? t('deal_chat.me', 'Me') : counterpartyName)}
                      </span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded-md font-semibold ${
                          m.sender_role === 'farmer'
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {m.sender_role === 'farmer' ? t('deal_chat.farmer', 'Farmer') : t('deal_chat.buyer', 'Buyer')}
                      </span>
                      <span className="text-[10px] text-copy-muted">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-brand text-on-brand rounded-tr-xs font-medium'
                          : 'bg-surface border border-surface-border text-copy-primary rounded-tl-xs'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Coordination Reply Chips */}
            <div className="px-4 py-2 bg-surface border-t border-surface-border/60 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <span className="text-[11px] uppercase font-bold tracking-wider text-copy-muted shrink-0 mr-1">
                  {t('deal_chat.quick_replies', 'Quick:')}
                </span>
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-bg-subtle hover:bg-brand/10 hover:text-brand border border-surface-border text-copy-secondary text-xs transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input Box */}
            <div className="p-3 sm:p-4 bg-surface border-t border-surface-border shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isFarmer
                      ? t('deal_chat.farmer_placeholder', 'Message buyer about tractor arrival, field directions...')
                      : t('deal_chat.buyer_placeholder', 'Message farmer about baler dispatch time, payment...')
                  }
                  className="flex-1 bg-bg-subtle border border-surface-border rounded-xl px-4 py-3 text-sm text-copy-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className={`px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer ${
                    inputText.trim() && !sending
                      ? 'bg-brand text-on-brand hover:bg-accent-secondary shadow-xs'
                      : 'bg-bg-subtle text-copy-muted cursor-not-allowed border border-surface-border'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('deal_chat.send', 'Send')}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Full Contract & Counterparty Details */}
        {activeTab === 'details' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-bg-canvas/30">
            {/* Top Stat Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface p-4 rounded-2xl border border-surface-border shadow-xs">
                <span className="text-[11px] uppercase font-bold text-copy-muted block">{t('deal_chat.agreed_price', 'Agreed Price')}</span>
                <strong className="text-xl font-bold text-brand mt-1 block">
                  ₹{deal?.price_per_tonne.toLocaleString() || '1,850'}/t
                </strong>
                <span className="text-xs text-copy-secondary mt-0.5 block">{t('deal_chat.fixed_contract', 'Fixed Rate')}</span>
              </div>
              <div className="bg-surface p-4 rounded-2xl border border-surface-border shadow-xs">
                <span className="text-[11px] uppercase font-bold text-copy-muted block">{t('deal_chat.total_quantity', 'Straw Load')}</span>
                <strong className="text-xl font-bold text-copy-primary mt-1 block">
                  {deal?.est_tonnes || 25} {t('common.tonne', 'Tonnes')}
                </strong>
                <span className="text-xs text-copy-secondary mt-0.5 block">
                  {deal?.farmer?.acres ? `${deal.farmer.acres} Acres Field` : 'From Paddy Plot'}
                </span>
              </div>
              <div className="bg-surface p-4 rounded-2xl border border-surface-border shadow-xs">
                <span className="text-[11px] uppercase font-bold text-copy-muted block">{t('deal_chat.total_payout_amount', 'Total Payout')}</span>
                <strong className="text-xl font-bold text-state-success mt-1 block">
                  ₹{deal?.total_amount.toLocaleString() || '46,250'}
                </strong>
                <span className="text-xs text-copy-secondary mt-0.5 block">{t('deal_chat.instant_transfer', 'Escrow Guaranteed')}</span>
              </div>
              <div className="bg-surface p-4 rounded-2xl border border-surface-border shadow-xs">
                <span className="text-[11px] uppercase font-bold text-copy-muted block">{t('deal_chat.pickup_dates', 'Pickup Window')}</span>
                <strong className="text-sm font-bold text-copy-primary mt-1 block">
                  {deal?.pickup_start || 'Immediate'}
                </strong>
                <span className="text-xs text-copy-secondary mt-0.5 block">
                  {deal?.pickup_end ? `until ${deal.pickup_end}` : 'Within 3-5 days'}
                </span>
              </div>
            </div>

            {/* Counterparty Deep-Dive Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Farmer Profile Card */}
              <div className="bg-surface p-5 rounded-2xl border border-surface-border shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌾</span>
                    <h4 className="font-bold text-base text-copy-primary">
                      {t('deal_chat.farmer_details', "Farmer's Details")}
                    </h4>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full">
                    {t('deal_chat.verified_farmer', 'Verified')}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-surface-border/30">
                    <span className="text-copy-secondary">{t('deal_chat.name', 'Farmer Name:')}</span>
                    <strong className="text-copy-primary">{deal?.farmer?.name || 'Local Farmer'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/30">
                    <span className="text-copy-secondary">{t('deal_chat.contact_phone', 'Phone Number:')}</span>
                    <a
                      href={`tel:${deal?.farmer?.phone || '+919999900001'}`}
                      className="text-brand font-bold hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{deal?.farmer?.phone || '+919999900001'}</span>
                    </a>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/30">
                    <span className="text-copy-secondary">{t('deal_chat.village_field', 'Field Village:')}</span>
                    <strong className="text-copy-primary">{deal?.farmer?.village_name || 'Chuhar Chak'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/30">
                    <span className="text-copy-secondary">{t('deal_chat.district', 'District:')}</span>
                    <strong className="text-copy-primary">{deal?.farmer?.district || 'Punjab'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/30">
                    <span className="text-copy-secondary">{t('deal_chat.stubble_form', 'Residue Form:')}</span>
                    <strong className="text-copy-primary capitalize">
                      {deal?.farmer?.stubble_form?.replace(/_/g, ' ') || 'Grade A SMS Chopped Bales'}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-copy-secondary">{t('deal_chat.satellite_check', 'Satellite Scan:')}</span>
                    <span className="text-state-success font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t('deal_chat.clean_burn_free', 'Zero-Burn Clean Field')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Buyer Profile Card */}
              <div className="bg-surface p-5 rounded-2xl border border-surface-border shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏭</span>
                    <h4 className="font-bold text-base text-copy-primary">
                      {t('deal_chat.buyer_details', "Buyer's Details")}
                    </h4>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full">
                    {t('deal_chat.industrial_buyer', 'Industrial')}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-surface-border/30">
                    <span className="text-copy-secondary">{t('deal_chat.company_name', 'Company / Plant:')}</span>
                    <strong className="text-copy-primary">{deal?.buyer?.org_name || 'Industrial Biomass Buyer'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/30">
                    <span className="text-copy-secondary">{t('deal_chat.contact_officer', 'Procurement Officer:')}</span>
                    <strong className="text-copy-primary">{deal?.buyer?.contact_name || 'Procurement Manager'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/30">
                    <span className="text-copy-secondary">{t('deal_chat.buyer_phone', 'Official Phone:')}</span>
                    <a
                      href={`tel:${deal?.buyer?.phone || '+919876543210'}`}
                      className="text-brand font-bold hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{deal?.buyer?.phone || '+919876543210'}</span>
                    </a>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/30">
                    <span className="text-copy-secondary">{t('deal_chat.industry_type', 'End-Use Industry:')}</span>
                    <strong className="text-copy-primary capitalize">
                      {deal?.buyer?.type || 'Biomass Power Plant / Pellet'}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-border/30">
                    <span className="text-copy-secondary">{t('deal_chat.deal_contract_id', 'Deal Contract ID:')}</span>
                    <span className="font-mono text-[11px] text-copy-muted">{deal?.id?.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-copy-secondary">{t('deal_chat.payment_guarantee', 'Payout Security:')}</span>
                    <span className="text-state-success font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('deal_chat.direct_transfer', 'Direct Bank Transfer / Escrow')}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Footer in Details Tab */}
            <div className="p-4 rounded-2xl bg-brand/10 border border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤝</span>
                <div>
                  <h5 className="font-bold text-copy-primary">{t('deal_chat.deal_locked_title', 'Binding Direct Supply Contract')}</h5>
                  <p className="text-copy-secondary">
                    {t('deal_chat.deal_locked_desc', 'Both farmer and buyer have accepted this transaction. Baler logistics team is authorized for field entry.')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('chat')}
                className="px-4 py-2 bg-brand text-on-brand rounded-xl font-bold hover:bg-accent-secondary transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
              >
                {t('deal_chat.back_to_chat', 'Return to Live Chat →')}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Logistics & Baler Details */}
        {activeTab === 'logistics' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-bg-canvas/30">
            <div className="bg-surface p-5 rounded-2xl border border-surface-border shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚜</span>
                  <h4 className="font-bold text-base text-copy-primary">
                    {t('deal_chat.baler_team_title', 'Assigned Baler & Logistics Partner')}
                  </h4>
                </div>
                <span className="text-[10px] font-semibold bg-state-success-dim text-state-success px-2.5 py-0.5 rounded-full">
                  {t('deal_chat.dispatched', 'Operational')}
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-bg-subtle border border-surface-border/50">
                  <span className="text-copy-muted block">{t('deal_chat.baler_team', 'Logistics Team:')}</span>
                  <strong className="text-copy-primary text-sm mt-0.5 block">
                    {deal?.baler?.name || 'Punjab Agri Baler Hub (Team 4)'}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-bg-subtle border border-surface-border/50">
                  <span className="text-copy-muted block">{t('deal_chat.baler_contact', 'Logistics Driver / Supervisor:')}</span>
                  <a
                    href={`tel:${deal?.baler?.phone || '+919999999902'}`}
                    className="text-brand font-bold text-sm mt-0.5 block hover:underline"
                  >
                    {deal?.baler?.phone || '+919999999902'}
                  </a>
                </div>
                <div className="p-3 rounded-xl bg-bg-subtle border border-surface-border/50">
                  <span className="text-copy-muted block">{t('deal_chat.pickup_schedule', 'Target Arrival:')}</span>
                  <strong className="text-copy-primary text-sm mt-0.5 block">
                    {deal?.pickup_start || 'Within 48 hours'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Field Entry Guidelines */}
            <div className="bg-surface p-5 rounded-2xl border border-surface-border shadow-xs space-y-3">
              <h5 className="font-bold text-sm text-copy-primary flex items-center gap-2">
                <span>📋</span>
                <span>{t('deal_chat.logistics_checklist_title', 'Field Arrival & Weighing Checklist')}</span>
              </h5>
              <div className="space-y-2 text-xs text-copy-secondary">
                <div className="flex items-start gap-2">
                  <span className="text-state-success font-bold">✓</span>
                  <p>{t('deal_chat.check_1', 'Keep tractor passage gate wide and dry to facilitate 14-tonne trolley entrance.')}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-state-success font-bold">✓</span>
                  <p>{t('deal_chat.check_2', 'Farmer receives electronic weighbridge receipt immediately upon trolley loading.')}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-state-success font-bold">✓</span>
                  <p>{t('deal_chat.check_3', 'Buyer releases payment within 24 hours of weighbridge receipt confirmation.')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
