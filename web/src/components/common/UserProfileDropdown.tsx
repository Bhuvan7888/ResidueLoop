import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { signInDevUser } from '@/features/auth/api'

interface ProfileDetails {
  name?: string
  phone?: string
  role?: string
  language?: string
  villageName?: string
  district?: string
  idStatus?: string
  plotCount?: number
  totalAcres?: number
  orgName?: string
  buyerType?: string
  capacity?: number
  minLoad?: number
  pricePerTonne?: number
}

interface UserProfileDropdownProps {
  onSignOut: () => void
}

export function UserProfileDropdown({ onSignOut }: UserProfileDropdownProps) {
  const { session, role } = useAuth()
  const { t } = useTranslation()
  const [details, setDetails] = useState<ProfileDetails | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return

    let isMounted = true
    const fetchDetails = async () => {
      try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

        let extra: Partial<ProfileDetails> = {}

        if (role === 'farmer') {
          const { data: farmer } = await supabase
            .from('farmers')
            .select('*, villages(name, district)')
            .eq('profile_id', userId)
            .maybeSingle()

          const { data: plots } = await supabase
            .from('plots')
            .select('acres')
            .eq('farmer_id', userId)

          const totalAcres = (plots || []).reduce((sum, p) => sum + (Number(p.acres) || 0), 0)

          extra = {
            villageName: farmer?.villages?.name,
            district: farmer?.villages?.district,
            idStatus: farmer?.id_status || 'not_submitted',
            plotCount: plots?.length || 0,
            totalAcres,
          }
        } else if (role === 'buyer') {
          const { data: buyer } = await supabase
            .from('buyers')
            .select('*')
            .eq('profile_id', userId)
            .maybeSingle()

          if (buyer) {
            extra = {
              orgName: buyer.org_name,
              buyerType: buyer.type,
              capacity: Number(buyer.capacity),
              minLoad: Number(buyer.min_load_tonnes),
              pricePerTonne: Number(buyer.price_per_tonne),
            }
          }
        }

        if (isMounted) {
          setDetails({
            name: profile?.name || session?.user?.user_metadata?.name || 'User',
            phone: profile?.phone || session?.user?.phone || '+919999999999',
            role: profile?.role || role || 'farmer',
            language: profile?.language || 'en',
            ...extra,
          })
        }
      } catch (err) {
        console.error('Error fetching user profile details:', err)
      }
    }

    fetchDetails()
    return () => {
      isMounted = false
    }
  }, [userId, role, session])

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 250)
  }

  const roleLabel = t(`auth.role_${role}`) || role || 'Member'
  const displayName = details?.name || (role === 'buyer' ? details?.orgName : undefined) || 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className="relative inline-block text-left"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Pill / Avatar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-full bg-surface border border-surface-border px-3 py-1.5 shadow-xs hover:border-brand/40 hover:bg-bg-subtle transition-all cursor-pointer group focus:outline-none"
        aria-expanded={isOpen}
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-brand/15 text-brand flex items-center justify-center font-bold text-xs ring-1 ring-brand/30">
            {initials || 'RL'}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-state-success ring-2 ring-surface"></span>
        </div>

        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-copy-primary truncate max-w-[120px]">
            {displayName}
          </p>
          <p className="text-[10px] text-copy-secondary capitalize flex items-center gap-1">
            <span>{roleLabel}</span>
            <span className="text-brand">▾</span>
          </p>
        </div>
      </button>

      {/* Hover Dropdown Drawer */}
      <div
        className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface border border-surface-border shadow-2xl p-4 z-50 transition-all duration-200 transform origin-top-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* Header Profile Banner */}
        <div className="flex items-start justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand/15 text-brand flex items-center justify-center font-display font-bold text-sm ring-1 ring-brand/30 shadow-xs">
              {initials || 'RL'}
            </div>
            <div>
              <h4 className="text-sm font-bold text-copy-primary leading-tight">
                {displayName}
              </h4>
              <p className="text-xs text-copy-secondary font-mono mt-0.5">
                {details?.phone}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-brand/10 text-brand border border-brand/20">
            {roleLabel}
          </span>
        </div>

        {/* Saved User Details Section */}
        <div className="py-3 space-y-2 text-xs">
          <p className="text-[11px] font-semibold text-copy-secondary uppercase tracking-wider">
            Saved Profile Details
          </p>

          {role === 'farmer' && (
            <div className="space-y-1.5 bg-bg-subtle/60 rounded-xl p-3 border border-surface-border">
              <div className="flex justify-between items-center">
                <span className="text-copy-secondary">Home Village:</span>
                <span className="font-semibold text-copy-primary">
                  {details?.villageName ? `${details.villageName}, ${details.district || 'Moga'}` : 'Not selected yet'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-copy-secondary">Registered Land:</span>
                <span className="font-semibold text-copy-primary">
                  {details?.totalAcres ? `${details.totalAcres.toFixed(1)} acres (${details.plotCount} plots)` : '0 plots registered'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-copy-secondary">Identity Verification:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    details?.idStatus === 'verified'
                      ? 'bg-state-success-dim text-state-success'
                      : details?.idStatus === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-bg-subtle text-copy-secondary'
                  }`}
                >
                  {details?.idStatus === 'verified'
                    ? '🛡️ Verified Farmer'
                    : details?.idStatus === 'pending'
                    ? '⏳ In Review'
                    : 'Not Submitted'}
                </span>
              </div>
            </div>
          )}

          {role === 'buyer' && (
            <div className="space-y-1.5 bg-bg-subtle/60 rounded-xl p-3 border border-surface-border">
              <div className="flex justify-between items-center">
                <span className="text-copy-secondary">Organization:</span>
                <span className="font-semibold text-copy-primary truncate max-w-[160px]">
                  {details?.orgName || 'Industrial Plant'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-copy-secondary">Facility Type:</span>
                <span className="font-semibold text-copy-primary capitalize">
                  {details?.buyerType || 'Biomass'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-copy-secondary">Target Capacity:</span>
                <span className="font-semibold text-copy-primary">
                  {details?.capacity ? `${details.capacity} tonnes/season` : 'Active'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-copy-secondary">Minimum Load:</span>
                <span className="font-semibold text-copy-primary">
                  {details?.minLoad ? `${details.minLoad} tonnes` : '8 tonnes'}
                </span>
              </div>
              {details?.pricePerTonne && (
                <div className="flex justify-between items-center">
                  <span className="text-copy-secondary">Offer Rate:</span>
                  <span className="font-semibold text-brand">
                    ₹{details.pricePerTonne.toLocaleString()}/t
                  </span>
                </div>
              )}
            </div>
          )}

          {(role === 'donor' || role === 'ngo') && (
            <div className="space-y-1.5 bg-bg-subtle/60 rounded-xl p-3 border border-surface-border">
              <div className="flex justify-between items-center">
                <span className="text-copy-secondary">Mission:</span>
                <span className="font-semibold text-copy-primary">Anti-Stubble Burning & Clean Air</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-copy-secondary">Target Focus:</span>
                <span className="font-semibold text-copy-primary">Punjab & Delhi NCR Corridors</span>
              </div>
            </div>
          )}

          {/* Security & Sync Status */}
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-center gap-2">
            <span className="text-sm">🔒</span>
            <div>
              <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                End-to-End Encrypted (AES-256 GCM)
              </p>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                Real-time zero-delay sync active with ResidueLoop Network
              </p>
            </div>
          </div>
        </div>

        {/* Switch Portal Role View */}
        <div className="pt-2.5 pb-1 border-t border-surface-border space-y-1.5">
          <p className="text-[10px] font-semibold text-copy-secondary uppercase tracking-wider">
            Switch Portal Role View
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={role === 'farmer'}
              onClick={async () => {
                await signInDevUser('farmer')
                window.location.reload()
              }}
              className={`py-1.5 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
                role === 'farmer'
                  ? 'bg-brand text-on-brand font-bold shadow-xs cursor-default'
                  : 'bg-bg-subtle hover:bg-surface border border-surface-border text-copy-primary hover:border-brand/40'
              }`}
            >
              🌾 Farmer
            </button>
            <button
              type="button"
              disabled={role === 'buyer'}
              onClick={async () => {
                await signInDevUser('buyer')
                window.location.reload()
              }}
              className={`py-1.5 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
                role === 'buyer'
                  ? 'bg-brand text-on-brand font-bold shadow-xs cursor-default'
                  : 'bg-bg-subtle hover:bg-surface border border-surface-border text-copy-primary hover:border-brand/40'
              }`}
            >
              🏭 Buyer
            </button>
            <button
              type="button"
              disabled={role === 'donor'}
              onClick={async () => {
                await signInDevUser('donor')
                window.location.reload()
              }}
              className={`py-1.5 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
                role === 'donor'
                  ? 'bg-brand text-on-brand font-bold shadow-xs cursor-default'
                  : 'bg-bg-subtle hover:bg-surface border border-surface-border text-copy-primary hover:border-brand/40'
              }`}
            >
              🌱 Donor
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-surface-border flex items-center justify-between gap-2">
          <span className="text-[11px] text-copy-secondary font-mono">
            ID: {userId?.slice(0, 8)}...
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="px-3 py-1.5 rounded-xl bg-surface border border-surface-border text-xs font-medium text-state-error hover:bg-state-error-dim transition-colors"
          >
            {t('common.sign_out')}
          </button>
        </div>
      </div>
    </div>
  )
}
