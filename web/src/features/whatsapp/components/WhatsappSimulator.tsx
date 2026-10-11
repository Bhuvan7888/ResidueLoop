import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { simulateWhatsappMessage } from '../api'

interface WhatsappSimulatorProps {
  userPhone: string
  onMessageSent: () => void
}

const PROMPTS_HI = [
  { label: '🌾 1. "Hi" (प्रश्नावली शुरू करें)', text: 'Hi' },
  { label: '📍 2. "5" (5 एकड़)', text: '5' },
  { label: '🗓️ 3. "2" (1 सप्ताह में कटाई)', text: '2' },
  { label: '⭐ 4. "1" (ग्रेड ए+ चारा)', text: '1' },
  { label: '🐄 5. "1" (पशु आहार / डेयरी)', text: '1' },
  { label: '📦 6. "2" (गांठें पहुँचाई गईं)', text: '2' },
  { label: '🤝 "हाँ" (प्रस्ताव स्वीकार करें)', text: 'हाँ' },
  { label: '🗓️ पिकअप तिथि (स्थिति पूछें)', text: 'मेरी पिकअप तिथि कब है?' },
  { label: '💵 "मिल गए" (भुगतान प्राप्त)', text: 'भुगतान मिल गया है' },
]

const PROMPTS_PA = [
  { label: '🌾 1. "Hi" (ਪ੍ਰਸ਼ਨਾਵਲੀ ਸ਼ੁਰੂ ਕਰੋ)', text: 'Hi' },
  { label: '📍 2. "5" (5 ਏਕੜ)', text: '5' },
  { label: '🗓️ 3. "2" (1 ਹਫ਼ਤੇ ਵਿੱਚ ਵਾਢੀ)', text: '2' },
  { label: '⭐ 4. "1" (ਗ੍ਰੇਡ ਏ+ ਚਾਰਾ)', text: '1' },
  { label: '🐄 5. "1" (ਪਸ਼ੂ ਚਾਰਾ / ਡੇਅਰੀ)', text: '1' },
  { label: '📦 6. "2" (ਗੰਢਾਂ ਪਹੁੰਚਾਈਆਂ)', text: '2' },
  { label: '🤝 "ਹਾਂ" (ਪੇਸ਼ਕਸ਼ ਸਵੀਕਾਰ ਕਰੋ)', text: 'ਹਾਂ' },
  { label: '🗓️ ਪਿਕਅੱਪ ਮਿਤੀ (ਸਥਿਤੀ ਪੁੱਛੋ)', text: 'ਮੇਰੀ ਪਿਕਅੱਪ ਮਿਤੀ ਕਦੋਂ ਹੈ?' },
  { label: '💵 "ਮਿਲ ਗਏ" (ਭੁਗਤਾਨ ਪ੍ਰਾਪਤ)', text: 'ਭੁਗਤਾਨ ਮਿਲ ਗਿਆ ਹੈ' },
]

const PROMPTS_EN = [
  { label: '🌾 1. "Hi" (Start Questionnaire)', text: 'Hi' },
  { label: '📍 2. "5" (5 Acres)', text: '5' },
  { label: '🗓️ 3. "2" (1 Week Harvest)', text: '2' },
  { label: '⭐ 4. "1" (Grade A+ Fodder)', text: '1' },
  { label: '🐄 5. "1" (Cattle Feed / Dairy)', text: '1' },
  { label: '📦 6. "2" (Delivered Bales)', text: '2' },
  { label: '🤝 "Yes" (Accept Matched Offer)', text: 'Yes' },
  { label: '🗓️ Pickup Status', text: 'When is my pickup scheduled?' },
  { label: '💵 "Received" (Payment Received)', text: 'Payment received' },
]

export function WhatsappSimulator({ userPhone, onMessageSent }: WhatsappSimulatorProps) {
  const { i18n } = useTranslation()
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const prompts = i18n.language === 'hi' ? PROMPTS_HI : i18n.language === 'pa' ? PROMPTS_PA : PROMPTS_EN

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return
    setIsSending(true)
    setFeedback(null)
    try {
      await simulateWhatsappMessage(userPhone, textToSend)
      setInputText('')
      setFeedback(i18n.language === 'hi' ? 'व्हाट्सएप चैनल के माध्यम से संदेश सिंक हुआ!' : i18n.language === 'pa' ? 'ਵਟਸਐਪ ਰਾਹੀਂ ਸੁਨੇਹਾ ਸਿੰਕ ਹੋ ਗਿਆ!' : 'Message synced via WhatsApp channel!')
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
            <h4 className="text-sm font-bold text-copy-primary">
              {i18n.language === 'hi' ? 'व्हाट्सएप दो-तरफ़ा इंटरैक्टिव सिम्युलेटर' : i18n.language === 'pa' ? 'ਵਟਸਐਪ ਇੰਟਰਐਕਟਿਵ ਸਿਮੂਲੇਟਰ' : 'WhatsApp Two-Way Interactive Simulator'}
            </h4>
            <p className="text-xs text-copy-secondary">
              {i18n.language === 'hi'
                ? 'इस फोन नंबर के लिए व्हाट्सएप संदेश भेजने और प्राप्त करने का अनुकरण करता है: '
                : i18n.language === 'pa'
                ? 'ਇਸ ਫੋਨ ਲਈ ਵਟਸਐਪ ਸੁਨੇਹੇ ਭੇਜਣ ਅਤੇ ਪ੍ਰਾਪਤ ਕਰਨ ਦੀ ਨਕਲ ਕਰਦਾ ਹੈ: '
                : 'Simulates sending and receiving WhatsApp messages for phone: '}
              <span className="font-mono font-medium text-copy-primary">{userPhone}</span>
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-state-success-dim text-state-success border border-state-success/30">
          {i18n.language === 'hi' ? 'कनेक्टेड' : i18n.language === 'pa' ? 'ਕਨੈਕਟਡ' : 'Connected'}
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
          {i18n.language === 'hi' ? 'त्वरित कार्रवाइयाँ (क्लिक करें):' : i18n.language === 'pa' ? 'ਤੁਰੰਤ ਕਾਰਵਾਈਆਂ:' : 'Quick Actions:'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {prompts.map((p, idx) => (
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
          placeholder={
            i18n.language === 'hi'
              ? 'संदेश लिखें (उदा. मेरी पिकअप कब है? या हाँ)...'
              : i18n.language === 'pa'
              ? 'ਸੁਨੇਹਾ ਲਿਖੋ (ਜਿਵੇਂ ਕਿ ਮੇਰੀ ਪਿਕਅੱਪ ਕਦੋਂ ਹੈ?)...'
              : 'Type a message (e.g. When is my pickup? or Yes)...'
          }
          disabled={isSending}
          className="flex-1 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-copy-primary placeholder:text-copy-muted focus:ring-2 focus:ring-accent-primary outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !inputText.trim()}
          className="px-4 py-2 bg-brand text-on-brand rounded-xl text-xs font-semibold hover:bg-accent-secondary disabled:opacity-50 shadow-xs transition-colors"
        >
          {isSending
            ? (i18n.language === 'hi' ? 'भेजा जा रहा है...' : 'Sending...')
            : (i18n.language === 'hi' ? 'भेजें' : i18n.language === 'pa' ? 'ਭੇਜੋ' : 'Send')}
        </button>
      </form>
    </div>
  )
}
