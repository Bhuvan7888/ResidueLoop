import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LanguageSwitchProps {
  compact?: boolean
}

export function LanguageSwitch({ compact = false }: LanguageSwitchProps) {
  const { i18n, t } = useTranslation()
  const isEnglish = i18n.language === 'en'

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(isEnglish ? 'pa' : 'en')}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border px-3 text-sm font-medium text-copy-primary transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      aria-label={t('common.switch_language')}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span>{compact ? (isEnglish ? 'ਪੰਜਾਬੀ' : 'English') : t(isEnglish ? 'common.punjabi' : 'common.english')}</span>
    </button>
  )
}
