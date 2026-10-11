import { useState } from 'react'
import { simulateWhatsappMessage } from '../api'

interface WhatsappSimulatorProps {
  userPhone: string
  onMessageSent: () => void
}

const QUICK_PROMPTS = [
  { label: '🌾 1. "Hi" (Start Questionnaire)', text: 'Hi' },
  { label: '📍 2. "5" (5 Acres)', text: '5' },
  { label: '🗓️ 3. "2" (1 Week Harvest)', text: '2' },
  { label: '⭐ 4. "1" (Grade A+ Fodder)', text: '1' },
  { label: '🐄 5. "1" (Cattle Feed / Dairy)', text: '1' },
  { label: '📦 6. "2" (Delivered Bales)', text: '2' },
  { label: '🤝 "ਹਾਂ" (Accept Matched Offer)', text: 'ਹਾਂ' },
  { label: '🗓️ ਪਿਕਅੱਪ ਮਿਤੀ (Pickup Status)', text: 'ਮੇਰੀ ਪਿਕਅੱਪ ਮਿਤੀ ਕਦੋਂ ਹੈ?' },
  { label: '💵 "ਮਿਲ ਗਏ" (Payment Received)', text: 'ਭੁਗਤਾਨ ਮਿਲ ਗਿਆ ਹੈ' },
]

export function WhatsappSimulator({ userPhone, onMessageSent }: WhatsappSimulatorProps) {
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return
    setIsSending(true)
    setFeedback(null)
    try {
      await simulateWhatsappMessage(userPhone, textToSend)
      setInputText('')
      setFeedback('Message synced via WhatsApp channel!')
      setTimeout(() => setFeedback(null), 3000)
      onMessageSent()
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <div>
            <h4 className="text-sm font-bold text-copy-primary">WhatsApp Two-Way Interactive Simulator</h4>
            <p className="text-xs text-copy-secondary">
              Simulates sending and receiving WhatsApp messages for phone: <span className="font-mono font-medium text-copy-primary">{userPhone}</span>
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-state-success-dim text-state-success border border-state-success/30">
          Connected
        </span>
      </div>

      {feedback && (
        <p className="text-xs text-state-success font-medium bg-state-success-dim px-3 py-1.5 rounded-lg border border-state-success/20">
          {feedback}
        </p>
      )}

      {/* Quick Action Chips */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-copy-secondary uppercase tracking-wider">
          Quick Punjabi Actions:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSending}
              onClick={() => handleSend(p.text)}
              className="text-xs px-2.5 py-1 rounded-xl bg-bg-subtle border border-surface-border text-copy-primary hover:border-brand/50 hover:bg-surface transition-all active:scale-95 disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Message Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend(inputText)
        }}
        className="flex gap-2 pt-1"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="ਸੁਨੇਹਾ ਲਿਖੋ (e.g. ਮੇਰੀ ਪਿਕਅੱਪ ਕਦੋਂ ਹੈ? or When is my pickup?)..."
          disabled={isSending}
          className="flex-1 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-copy-primary placeholder:text-copy-muted focus:ring-2 focus:ring-accent-primary outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !inputText.trim()}
          className="px-4 py-2 bg-brand text-on-brand rounded-xl text-xs font-semibold hover:bg-accent-secondary disabled:opacity-50 shadow-xs transition-colors"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
