import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { requestAssistance, getNGOs } from '../api'

interface Props {
  listingId: string
  onSubmit: () => void
  onCancel: () => void
}

export function AssistanceRequestForm({ listingId, onSubmit, onCancel }: Props) {
  const { t, i18n } = useTranslation()
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
      <h3 className="font-semibold text-copy-primary mb-1">
        {i18n.language === 'hi' ? 'नागरिक चैरिटी एवं क्राउडफंडेड निकासी का अनुरोध' : i18n.language === 'pa' ? 'ਚੈਰਿਟੀ ਅਤੇ ਕ੍ਰਾਊਡਫੰਡਿੰਗ ਸਹਾਇਤਾ ਦੀ ਬੇਨਤੀ' : 'Request Charity & Crowdfunded Clearance'}
      </h3>
      <p className="text-xs text-copy-secondary mb-4">
        {i18n.language === 'hi'
          ? 'नागरिक प्रायोजन के लिए अपना खेत सूचीबद्ध करें ताकि भारी बेलर बिना किसी लागत के आपके खेत से पराली हटा सकें।'
          : i18n.language === 'pa'
          ? 'ਨਾਗਰਿਕ ਸਪਾਂਸਰਸ਼ਿਪ ਲਈ ਆਪਣੇ ਖੇਤ ਨੂੰ ਸੂਚੀਬੱਧ ਕਰੋ ਤਾਂ ਜੋ ਬੇਲਰ ਬਿਨਾਂ ਕਿਸੇ ਖਰਚੇ ਦੇ ਤੁਹਾਡੀ ਪਰਾਲੀ ਚੁੱਕ ਸਕਣ।'
          : 'List your field for citizen sponsorship so heavy balers can clear your stubble at zero cost to you.'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-copy-secondary mb-1">
            {i18n.language === 'hi' ? 'सहयोगी एनजीओ (मशीनरी सब्सिडी)' : i18n.language === 'pa' ? 'ਸਹਿਯੋਗੀ ਐਨਜੀਓ' : 'Partner NGO (Machinery Subsidies)'}
          </label>
          <select name="ngo_id" className="w-full border border-surface-border bg-surface rounded-xl p-2.5 text-copy-primary">
            {ngos.length === 0 ? (
              <option value="">
                {i18n.language === 'hi' ? 'क्लीन एयर एक्शन फाउंडेशन (डिफ़ॉल्ट)' : 'Clean Air Action Foundation (Default)'}
              </option>
            ) : (
              ngos.map(n => (
                <option key={n.profile_id} value={n.profile_id}>{n.profiles?.name || 'Clean Air Trust'}</option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm text-copy-secondary mb-1">
            {i18n.language === 'hi' ? 'आवश्यक राशि (₹)' : i18n.language === 'pa' ? 'ਲੋੜੀਂਦੀ ਰਕਮ (₹)' : 'Amount Needed (₹)'}
          </label>
          <input name="amount" type="number" required min="1" className="w-full border border-surface-border bg-surface rounded-lg p-2 text-copy-primary" />
        </div>
        <div>
          <label className="block text-sm text-copy-secondary mb-1">
            {i18n.language === 'hi' ? 'उद्देश्य' : i18n.language === 'pa' ? 'ਮਕਸਦ' : 'Purpose'}
          </label>
          <input
            name="purpose"
            type="text"
            placeholder={i18n.language === 'hi' ? 'उदा. बेलर मशीन किराए के लिए' : i18n.language === 'pa' ? 'ਜਿਵੇਂ: ਬੇਲਰ ਮਸ਼ੀਨ ਦੇ ਕਿਰਾਏ ਲਈ' : 'e.g. For baler rental'}
            required
            className="w-full border border-surface-border bg-surface rounded-lg p-2 text-copy-primary"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-brand text-on-brand rounded-lg py-2 font-medium">
            {i18n.language === 'hi' ? 'अनुरोध जमा करें' : i18n.language === 'pa' ? 'ਬੇਨਤੀ ਜਮ੍ਹਾਂ ਕਰੋ' : 'Submit Request'}
          </button>
          <button type="button" onClick={onCancel} className="flex-1 bg-surface border border-surface-border rounded-lg py-2 font-medium text-copy-primary">
            {t('common.cancel', 'रद्द करें')}
          </button>
        </div>
      </form>
    </div>
  )
}
