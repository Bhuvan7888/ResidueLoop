import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/common/StatusBadge'

export function SourceBadge({ source }: { source: 'web' | 'whatsapp' }) {
  const { t } = useTranslation()
  if (source === 'whatsapp') return <StatusBadge status="whatsapp" label={t('whatsapp.via_whatsapp', 'Via WhatsApp')} />
  return <span className="text-xs text-copy-muted">{t('whatsapp.via_web', 'Web')}</span>
}
