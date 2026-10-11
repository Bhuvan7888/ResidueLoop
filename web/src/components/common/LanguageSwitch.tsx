import { useState, useRef, useEffect } from 'react'
import { Languages, Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LanguageSwitchProps {
  compact?: boolean
}

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
] as const

export function LanguageSwitch({ compact = false }: LanguageSwitchProps) {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex ${
          compact ? 'min-h-9 px-2.5 py-1 text-xs' : 'min-h-10 sm:min-h-11 px-3 py-1.5 text-sm'
        } items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface font-medium text-copy-primary transition-all hover:bg-subtle active:scale-[0.98] shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
        aria-label={t('common.switch_language')}
        aria-expanded={isOpen}
      >
        <Languages className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-brand`} aria-hidden="true" />
        <span className="font-medium">{currentLang.native}</span>
        <ChevronDown
          className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-copy-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 origin-top-right rounded-2xl border border-surface-border bg-surface p-1.5 shadow-lg z-50">
          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-copy-secondary/80">
            {t('common.switch_language')}
          </div>
          <div className="space-y-0.5">
            {LANGUAGES.map((lang) => {
              const isSelected = i18n.language === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    i18n.changeLanguage(lang.code)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-brand/10 font-semibold text-brand'
                      : 'text-copy-primary hover:bg-subtle'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="leading-tight">{lang.native}</span>
                    <span className="text-[11px] text-copy-secondary leading-tight">{lang.label}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
