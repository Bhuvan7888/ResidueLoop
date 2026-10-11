import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/common/StatusBadge'
import { SatelliteRadarScope } from './SatelliteRadarScope'
import { SentinelSpectralGauge } from './SentinelSpectralGauge'

export interface VerificationProps {
  id?: string
  plot_id?: string
  verdict: 'verified' | 'fire_detected' | 'inconclusive'
  firms_hits: number
  nbr_delta: number
  confidence: string
  checked_at: string
  window_start?: string
  window_end?: string
}

export interface VerificationCardProps {
  verification?: VerificationProps
  plot?: {
    id?: string
    acres?: number
    centre?: { coordinates?: [number, number] }
    radius_m?: number
  }
  onTriggerCheck?: (scenario: 'verified' | 'fire_detected' | 'inconclusive' | 'real') => Promise<void> | void
  isTriggering?: boolean
  compact?: boolean
}

export function VerificationCard({
  verification,
  plot,
  onTriggerCheck,
  isTriggering = false,
  compact = false,
}: VerificationCardProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'sentinel' | 'radar'>('sentinel')

  const coords = (plot?.centre?.coordinates as [number, number]) || [75.171, 30.82]
  const radiusM = plot?.radius_m || 500

  // Format date if present
  const dateFormatted = verification?.checked_at
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(verification.checked_at))
    : null

  // If no verification row yet, render standby state with full visual telemetry preview
  if (!verification) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface p-5 space-y-4 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛰️</span>
            <div>
              <h4 className="font-sans font-semibold text-copy-primary text-sm">
                {t('verification.title', 'Satellite Verification')}
              </h4>
              <p className="text-[11px] text-copy-muted">NASA FIRMS & Sentinel-2 Earth Observation</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-subtle text-copy-secondary border border-surface-border">
            ⏳ {t('verification.pending', 'Awaiting Satellite Pass')}
          </span>
        </div>

        {/* View Switcher */}
        <div className="flex rounded-lg bg-bg-subtle p-0.5 border border-surface-border-subtle text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('sentinel')}
            className={`flex-1 py-1.5 px-3 rounded-md transition-all text-center ${
              activeTab === 'sentinel'
                ? 'bg-surface text-copy-primary shadow-xs font-semibold'
                : 'text-copy-muted hover:text-copy-primary'
            }`}
          >
            {t('verification.tab_sentinel', '🛰️ Sentinel-2 Multispectral')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`flex-1 py-1.5 px-3 rounded-md transition-all text-center ${
              activeTab === 'radar'
                ? 'bg-surface text-copy-primary shadow-xs font-semibold'
                : 'text-copy-muted hover:text-copy-primary'
            }`}
          >
            {t('verification.tab_radar', '🎯 NASA FIRMS Radar')}
          </button>
        </div>

        {/* Standby Visual Preview */}
        {activeTab === 'sentinel' ? (
          <SentinelSpectralGauge
            verdict="pending"
            nbrDelta={0.0}
            confidence="standby"
            compact={compact}
          />
        ) : (
          <SatelliteRadarScope
            verdict="pending"
            firmsHits={0}
            coordinates={coords}
            radiusM={radiusM}
            compact={compact}
          />
        )}

        {/* Evidence Status */}
        <div className="rounded-xl bg-bg-subtle/80 border border-surface-border-subtle p-3 text-xs text-copy-secondary">
          <p className="font-medium text-copy-primary">
            {t('verification.sensors_ready', '📡 Optical & Thermal Sensors Ready')}
          </p>
          <p className="text-[11px] text-copy-muted mt-0.5">
            {t('verification.sensors_desc', 'Automated orbital pass scans field perimeter for fire activity and burn scar changes post-pickup.')}
          </p>
        </div>

        {/* Trigger Button if onTriggerCheck passed */}
        {onTriggerCheck && (
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-copy-muted">{t('verification.run_check', 'Run Verification Now:')}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={isTriggering}
                onClick={() => onTriggerCheck('verified')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-state-success-dim border border-state-success/30 text-state-success hover:bg-state-success hover:text-white transition-all disabled:opacity-50"
              >
                ✓ {t('verification.scenario_clean', 'Clean Pass')}
              </button>
              <button
                type="button"
                disabled={isTriggering}
                onClick={() => onTriggerCheck('fire_detected')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-state-error-dim border border-state-error/30 text-state-error hover:bg-state-error hover:text-white transition-all disabled:opacity-50"
              >
                🔥 {t('verification.scenario_fire', 'Fire Alert')}
              </button>
              <button
                type="button"
                disabled={isTriggering}
                onClick={() => onTriggerCheck('inconclusive')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-bg-subtle border border-surface-border text-copy-secondary hover:bg-surface transition-all disabled:opacity-50"
              >
                ☁️ {t('verification.scenario_inconclusive', 'Cloudy')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Active Verification Card
  const isInconclusive = verification.verdict === 'inconclusive'
  const isFire = verification.verdict === 'fire_detected'

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 space-y-4 shadow-xs">
      {/* Header with Title and Verdict Badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛰️</span>
          <div>
            <h4 className="font-sans font-semibold text-copy-primary text-sm">
              {t('verification.title', 'Satellite Verification')}
            </h4>
            <p className="text-[11px] text-copy-muted">
              {dateFormatted ? t('verification.checked_on', 'Checked on {{date}}', { date: dateFormatted }) : 'Recent overpass'}
            </p>
          </div>
        </div>
        <StatusBadge
          status={verification.verdict}
          label={t(`verification.verdict.${verification.verdict}`, verification.verdict)}
        />
      </div>

      {/* View Switcher Tabs */}
      <div className="flex rounded-lg bg-bg-subtle p-0.5 border border-surface-border-subtle text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('sentinel')}
          className={`flex-1 py-1.5 px-3 rounded-md transition-all text-center ${
            activeTab === 'sentinel'
              ? 'bg-surface text-copy-primary shadow-xs font-semibold'
              : 'text-copy-muted hover:text-copy-primary'
          }`}
        >
          {t('verification.tab_sentinel', '🛰️ Sentinel-2 Multispectral')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('radar')}
          className={`flex-1 py-1.5 px-3 rounded-md transition-all text-center ${
            activeTab === 'radar'
              ? 'bg-surface text-copy-primary shadow-xs font-semibold'
              : 'text-copy-muted hover:text-copy-primary'
          }`}
        >
          {t('verification.tab_radar', '🎯 NASA FIRMS Radar')} ({verification.firms_hits} {t('verification.firms_hits_short', 'hits')})
        </button>
      </div>

      {/* Visual Component Render */}
      {activeTab === 'sentinel' ? (
        <SentinelSpectralGauge
          verdict={verification.verdict}
          nbrDelta={verification.nbr_delta}
          confidence={verification.confidence}
          checkedAt={verification.checked_at}
          compact={compact}
        />
      ) : (
        <SatelliteRadarScope
          verdict={verification.verdict}
          firmsHits={verification.firms_hits}
          coordinates={coords}
          radiusM={radiusM}
          compact={compact}
        />
      )}

      {/* Evidence Statement (Design Specs: State as evidence, never 'guaranteed' or 'proved') */}
      <div
        className={`rounded-xl p-3 text-xs space-y-1 border ${
          isFire
            ? 'bg-state-error-dim border-state-error/30 text-state-error'
            : isInconclusive
            ? 'bg-state-warning-dim border-state-warning/30 text-state-warning'
            : 'bg-state-success-dim border-state-success/30 text-state-success'
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold">
          <span>{isFire ? '⚠️' : isInconclusive ? '☁️' : '✅'}</span>
          <span>
            {isFire
              ? t('verification.fire_detected_title', 'Satellite Alert: Thermal Fire Anomaly Detected')
              : isInconclusive
              ? t('verification.inconclusive_title', 'Satellite Check Inconclusive: Optical Overpass Obscured')
              : t('verification.clean_title', 'Satellite Verified: Clean Clearance Confirmed')}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed opacity-95">
          {isFire &&
            t('verification.fire_evidence', 'NASA FIRMS registered {{hits}} thermal hotspot(s) with an NBR burn-scar shift of {{delta}}. Plot flagged for field review.', {
              hits: verification.firms_hits,
              delta: Number(verification.nbr_delta).toFixed(2),
            })}
          {isInconclusive &&
            t(
              'verification.inconclusive_reason',
              'Cloud cover or missing overpass obscured optical Sentinel-2 pass. An automated recheck is scheduled.'
            )}
          {!isFire &&
            !isInconclusive &&
            t('verification.clean_evidence', 'No fire detected and no burn scar found. Checked on {{date}}. Confidence: {{confidence}}.', {
              date: dateFormatted || 'recent pass',
              confidence: verification.confidence,
            })}
        </p>
      </div>

      {/* Simulator Actions if onTriggerCheck provided */}
      {onTriggerCheck && (
        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-surface-border-subtle pt-3">
          <span className="text-[10px] text-copy-muted uppercase font-semibold">{t('verification.simulate_label', 'Simulate / Re-test:')}</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={isTriggering}
              onClick={() => onTriggerCheck('verified')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-state-success-dim border border-state-success/30 text-state-success hover:bg-state-success hover:text-white transition-all disabled:opacity-50"
              title="Simulate clear Sentinel-2 NBR pass with 0 FIRMS fire hits"
            >
              ✓ {t('verification.scenario_clean', 'Clean Pass')}
            </button>
            <button
              type="button"
              disabled={isTriggering}
              onClick={() => onTriggerCheck('fire_detected')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-state-error-dim border border-state-error/30 text-state-error hover:bg-state-error hover:text-white transition-all disabled:opacity-50"
              title="Simulate FIRMS thermal fire alert"
            >
              🔥 {t('verification.scenario_fire', 'Fire Alert')}
            </button>
            <button
              type="button"
              disabled={isTriggering}
              onClick={() => onTriggerCheck('inconclusive')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-bg-subtle border border-surface-border text-copy-secondary hover:bg-surface transition-all disabled:opacity-50"
              title="Simulate optical cloud cover"
            >
              ☁️ {t('verification.scenario_inconclusive', 'Cloudy')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
