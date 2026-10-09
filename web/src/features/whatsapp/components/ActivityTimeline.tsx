import { useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/common/EmptyState'
import { getListings } from '@/features/listing/api'
import { getMessages } from '../api'
import { SourceBadge } from './SourceBadge'

interface ListingRow {
  id: string
  est_tonnes: number
  source: 'web' | 'whatsapp'
  created_at: string
}

interface Entry {
  id: string
  at: string
  source: 'web' | 'whatsapp'
  text: string
}

const REFRESH_MS = 10_000

export function ActivityTimeline() {
  const { t } = useTranslation()
  const messages = useQuery({ queryKey: ['messages'], queryFn: getMessages, refetchInterval: REFRESH_MS })
  const listings = useQuery({ queryKey: ['listings'], queryFn: getListings, refetchInterval: REFRESH_MS })

  const entries: Entry[] = [
    ...(messages.data ?? []).map((m) => ({
      id: m.id,
      at: m.created_at,
      source: 'whatsapp' as const,
      text: `${m.direction === 'in' ? t('whatsapp.you_wrote', 'You') : t('whatsapp.reply', 'Reply')}: ${m.raw_text}`,
    })),
    ...((listings.data ?? []) as ListingRow[]).map((l) => ({
      id: l.id,
      at: l.created_at,
      source: l.source,
      text: t('whatsapp.listing_created', 'Listing created, about {{tonnes}} t', { tonnes: l.est_tonnes }),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-medium text-copy-primary">{t('whatsapp.timeline_title', 'Activity')}</h3>
      {entries.length === 0 ? (
        <div className="bg-surface border border-surface-border rounded-2xl">
          <EmptyState icon={<MessageCircle />} message={t('whatsapp.timeline_empty', 'No activity yet.')} />
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="bg-surface border border-surface-border rounded-xl p-3 flex justify-between gap-3">
              <div>
                <p className="text-sm text-copy-primary break-words">{entry.text}</p>
                <p className="text-xs text-copy-muted">{new Date(entry.at).toLocaleString()}</p>
              </div>
              <SourceBadge source={entry.source} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
