import { useTranslation } from "react-i18next"
import { StatusBadge } from "@/components/common/StatusBadge"

interface VerificationProps {
  verdict: 'verified' | 'fire_detected' | 'inconclusive'
  firms_hits: number
  nbr_delta: number
  confidence: string
  checked_at: string
}

export function VerificationCard({ verification }: { verification?: VerificationProps }) {
  const { t } = useTranslation()

  if (!verification) {
    return (
      <div className="rounded-2xl border border-surface-border-subtle bg-subtle p-5">
        <p className="text-sm text-copy-muted">{t("verification.pending", "Verification pending pickup")}</p>
      </div>
    )
  }

  const isInconclusive = verification.verdict === 'inconclusive'
  const dateFormatted = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(verification.checked_at))

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-sans font-medium text-copy-primary">{t("verification.title", "Satellite Verification")}</h4>
        <StatusBadge status={verification.verdict} label={t(`verification.verdict.${verification.verdict}`, verification.verdict)} />
      </div>

      <div className="text-sm text-copy-secondary space-y-1">
        <p>{t("verification.checked_on", "Checked on {{date}}", { date: dateFormatted })}</p>
        
        {!isInconclusive && (
          <>
            <p>{t("verification.firms_hits", "Fire hits detected: {{count}}", { count: verification.firms_hits })}</p>
            <p>{t("verification.nbr_drop", "Burn scar change: {{drop}}", { drop: Number(verification.nbr_delta).toFixed(2) })}</p>
            <p className="text-xs text-copy-muted mt-2">{t("verification.confidence", "Confidence: {{level}}", { level: verification.confidence })}</p>
          </>
        )}
        
        {isInconclusive && (
          <p className="text-xs text-copy-muted mt-2">{t("verification.inconclusive_reason", "Cloud cover or missing overpass. A recheck is scheduled.")}</p>
        )}
      </div>
    </div>
  )
}
