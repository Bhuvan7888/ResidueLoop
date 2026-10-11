import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Tractor,
  Truck,
  UserCheck,
  Coins,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Flame,
  Phone,
  MapPin,
  RotateCcw,
  Copy,
  Check,
  Search,
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
  Wallet,
  Clock,
  Send,
  Sparkles,
} from 'lucide-react'
import {
  getNgoLedger,
  getNgoRequests,
  updateRequestStatus,
  recordDisbursement,
  getNotifications,
  getNgoDisbursements,
  getNgoDonations,
} from '../api'

interface AssistanceRequest {
  id: string
  status: string
  amount_requested: number
  purpose: string
  created_at?: string
  farmers?: {
    profiles?: {
      name?: string
      phone?: string
    }
  }
  listings?: {
    id?: string
    est_tonnes?: number
    status?: string
    acres?: number
    plots?: {
      acres?: number
      villages?: {
        name?: string
      }
    }
  }
}

interface DisbursementItem {
  id: string
  payee_name: string
  payee_type?: string
  amount: number
  note?: string
  created_at: string
  disbursed_at?: string
  assistance_requests?: {
    purpose: string
    farmers?: { profiles?: { name?: string } }
  }
}

interface DonationItem {
  id: string
  amount: number
  created_at: string
  donor?: { name?: string }
  villages?: { name?: string }
}

export function NgoDashboard({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const [ledger, setLedger] = useState({ totalReceived: 0, totalDisbursed: 0, balance: 0 })
  const [requests, setRequests] = useState<AssistanceRequest[]>([])
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([])
  const [donations, setDonations] = useState<DonationItem[]>([])
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([])

  // UI state
  const [activeTab, setActiveTab] = useState<'requests' | 'machinery' | 'ledger' | 'telemetry'>('requests')
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeLedgerTab, setActiveLedgerTab] = useState<'all' | 'disbursements' | 'donations'>('all')
  const [expandedDeployId, setExpandedDeployId] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [submittingReqId, setSubmittingReqId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [l, r, notifs, disb, don] = await Promise.all([
        getNgoLedger(userId).catch(() => ({ totalReceived: 0, totalDisbursed: 0, balance: 0 })),
        getNgoRequests(userId).catch(() => []),
        getNotifications(userId).catch(() => []),
        getNgoDisbursements(userId).catch(() => []),
        getNgoDonations(userId).catch(() => []),
      ])
      setLedger(l)
      setRequests((r as unknown as AssistanceRequest[]) || [])
      setNotifications(notifs || [])
      setDisbursements((disb as unknown as DisbursementItem[]) || [])
      setDonations((don as unknown as DonationItem[]) || [])
    } catch (err) {
      console.error('Error loading NGO dashboard data:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculated Operational Metrics
  const metrics = useMemo(() => {
    let totalAcres = 0
    let totalStraw = 0
    const uniqueFarmers = new Set<string>()

    requests.forEach((req) => {
      const acres = req.listings?.plots?.acres ?? req.listings?.acres ?? 0
      const straw = req.listings?.est_tonnes ?? acres * 2.2
      if (req.status === 'approved') {
        totalAcres += acres
        totalStraw += straw
      }
      if (req.farmers?.profiles?.name) {
        uniqueFarmers.add(req.farmers.profiles.name)
      }
    })

    const deployedPercent =
      ledger.totalReceived > 0
        ? Math.min(100, Math.round((ledger.totalDisbursed / ledger.totalReceived) * 100))
        : 0

    const readyAcres = Math.max(0, Math.floor(ledger.balance / 1300))
    const pendingCount = requests.filter((r) => r.status === 'pending').length
    const approvedCount = requests.filter((r) => r.status === 'approved').length
    const declinedCount = requests.filter((r) => r.status === 'declined').length

    // Breakdown by Payee Type
    let balerTotal = 0
    let transportTotal = 0
    let farmerTotal = 0

    disbursements.forEach((d) => {
      const type = (d.payee_type || 'baler').toLowerCase()
      if (type.includes('transport') || type.includes('hauler')) {
        transportTotal += d.amount
      } else if (type.includes('farmer')) {
        farmerTotal += d.amount
      } else {
        balerTotal += d.amount
      }
    })

    return {
      totalAcres,
      totalStraw,
      uniqueFarmersCount: uniqueFarmers.size || requests.length,
      deployedPercent,
      readyAcres,
      pendingCount,
      approvedCount,
      declinedCount,
      balerTotal,
      transportTotal,
      farmerTotal,
    }
  }, [requests, disbursements, ledger])

  // Request actions
  const handleAction = async (id: string, action: 'approved' | 'declined') => {
    try {
      await updateRequestStatus(id, action)
      setActionMsg({
        type: 'success',
        text:
          action === 'approved'
            ? t('ngo.approved_msg', 'Request approved successfully.')
            : t('ngo.declined_msg', 'Request declined.'),
      })
      if (action === 'approved') {
        setExpandedDeployId(id)
      }
      loadData()
    } catch (err: unknown) {
      setActionMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Action failed',
      })
    }
  }

  // Disbursement handler
  const handleDisbursement = async (req: AssistanceRequest, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmittingReqId(req.id)
    const form = e.currentTarget
    const payeeName = (form.elements.namedItem('payee_name') as HTMLInputElement).value
    const amount = Number((form.elements.namedItem('amount') as HTMLInputElement).value)
    const payeeType = ((form.elements.namedItem('payee_type') as HTMLSelectElement).value ||
      'baler') as 'baler' | 'transport provider' | 'farmer'
    const note = (form.elements.namedItem('note') as HTMLInputElement).value

    try {
      await recordDisbursement(req.id, payeeName, amount, payeeType, note)
      setActionMsg({
        type: 'success',
        text: `Disbursement of ₹${amount.toLocaleString()} to ${payeeName} recorded successfully!`,
      })
      form.reset()
      setExpandedDeployId(null)
      loadData()
    } catch (err: unknown) {
      setActionMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Disbursement failed',
      })
    } finally {
      setSubmittingReqId(null)
    }
  }

  // Copy audit summary
  const copyAuditSummary = () => {
    const summary = `🚜 ResidueLoop NGO Ground Operations Summary
• Total Clean Air Inflow: ₹${ledger.totalReceived.toLocaleString()}
• Total Outflow Disbursed: ₹${ledger.totalDisbursed.toLocaleString()} (${metrics.deployedPercent}% deployed)
• Available Working Capital: ₹${ledger.balance.toLocaleString()} (~${metrics.readyAcres} acres capacity)
• Rescued Farmland: ${metrics.totalAcres.toFixed(1)} Acres
• Paddy Straw Diverted: ~${metrics.totalStraw.toFixed(1)} Tonnes
• Verified Baler Disbursements: ${disbursements.length} transactions
Audit Timestamp: ${new Date().toLocaleString()} (Verified Non-Profit Pool)`

    navigator.clipboard.writeText(summary)
    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 2500)
  }

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (requestFilter !== 'all' && req.status !== requestFilter) return false
      if (!searchQuery.trim()) return true

      const q = searchQuery.toLowerCase()
      const farmerName = req.farmers?.profiles?.name?.toLowerCase() || ''
      const village = req.listings?.plots?.villages?.name?.toLowerCase() || ''
      const purpose = req.purpose?.toLowerCase() || ''
      return farmerName.includes(q) || village.includes(q) || purpose.includes(q)
    })
  }, [requests, requestFilter, searchQuery])

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {actionMsg && (
        <div
          className={`rounded-2xl border p-4 text-sm flex items-center justify-between shadow-xs transition-all ${
            actionMsg.type === 'success'
              ? 'bg-state-success-dim border-state-success/30 text-state-success'
              : 'bg-state-error-dim border-state-error/30 text-state-error'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <p className="font-semibold">{actionMsg.text}</p>
          </div>
          <button
            onClick={() => setActionMsg(null)}
            className="text-xs uppercase font-bold opacity-75 hover:opacity-100 px-2 py-1 rounded-lg hover:bg-surface/40 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Command Banner */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-copy-secondary">
                {t('ngo.eyebrow', 'Punjab Stubble Burning Prevention Network • Ground Operations')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-state-success-dim text-state-success border border-state-success/20">
                <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-pulse" />
                {t('ngo.operational_badge', 'Live Field Network Active')}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-copy-primary tracking-tight">
              {t('ngo.command_title', 'Machinery & Ground Operations Command')}
            </h2>
            <p className="text-sm text-copy-secondary leading-relaxed">
              {t(
                'ngo.command_sub',
                'Directing citizen clean air capital straight to baler operators, hauler trolleys, and distressed marginal farmers across target villages.'
              )}
            </p>
          </div>

          {/* Quick Command Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={copyAuditSummary}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bg-subtle text-copy-primary hover:bg-surface-border transition-colors border border-surface-border"
              title="Copy audit summary to clipboard"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-state-success" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? t('ngo.copied', 'Copied!') : t('ngo.copy_summary', 'Copy Audit Summary')}</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand text-on-brand hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{t('ngo.refresh_data', 'Refresh Telemetry')}</span>
            </button>
          </div>
        </div>

        {/* 3 Prominent KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Inflow Card */}
          <div className="bg-bg-subtle/50 border border-surface-border rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-copy-secondary">
                {t('ngo.inflow', 'Total Received (Inflow)')}
              </span>
              <div className="p-2 rounded-xl bg-brand/20 text-brand">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-display font-bold text-state-success tabular-nums">
              ₹{ledger.totalReceived.toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-[11px] text-copy-muted pt-1">
              <span>{t('ngo.inflow_sub', 'Citizen & Corporate Clean Air donations')}</span>
              <span className="font-semibold text-copy-primary">{donations.length} records</span>
            </div>
          </div>

          {/* Outflow Card */}
          <div className="bg-bg-subtle/50 border border-surface-border rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-copy-secondary">
                {t('ngo.outflow', 'Total Disbursed (Outflow)')}
              </span>
              <div className="p-2 rounded-xl bg-surface-border text-copy-secondary">
                <Tractor className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-display font-bold text-state-error tabular-nums">
              ₹{ledger.totalDisbursed.toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-[11px] text-copy-muted pt-1">
              <span>{t('ngo.outflow_sub', 'Direct to balers, transport & farmers')}</span>
              <span className="font-semibold text-copy-primary">
                {metrics.deployedPercent}% {t('ngo.stat_capital_deployed', 'Deployed')}
              </span>
            </div>
          </div>

          {/* Available Working Fund Card */}
          <div className="bg-bg-subtle/50 border border-surface-border rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-copy-secondary">
                {t('ngo.working_fund', 'Available Working Fund')}
              </span>
              <div className="p-2 rounded-xl bg-brand text-on-brand">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-display font-bold text-brand tabular-nums">
              ₹{ledger.balance.toLocaleString()}
            </p>
            <div className="text-[11px] text-copy-secondary pt-1 font-medium truncate">
              {t('ngo.working_capacity_hint', '~ Ready to clear approx. {{acres}} acres at ₹1,300/acre', {
                acres: metrics.readyAcres,
              })}
            </div>
          </div>
        </div>

        {/* Secondary Eco-Impact Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-surface-border/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-surface border border-surface-border text-copy-primary shrink-0">
              <ShieldCheck className="w-4 h-4 text-state-success" />
            </div>
            <div>
              <p className="text-xs font-bold text-copy-primary tabular-nums">
                {metrics.totalAcres.toFixed(1)} {t('ngo.acres_unit', 'Acres')}
              </p>
              <p className="text-[10px] text-copy-secondary">{t('ngo.stat_rescued_acres', 'Rescued Farmland')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-surface border border-surface-border text-copy-primary shrink-0">
              <Sparkles className="w-4 h-4 text-brand" />
            </div>
            <div>
              <p className="text-xs font-bold text-copy-primary tabular-nums">
                ~{metrics.totalStraw.toFixed(1)} {t('ngo.tonnes_unit', 'Tonnes')}
              </p>
              <p className="text-[10px] text-copy-secondary">{t('ngo.stat_straw_baled', 'Straw Diverted')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-surface border border-surface-border text-copy-primary shrink-0">
              <Flame className="w-4 h-4 text-state-error" />
            </div>
            <div>
              <p className="text-xs font-bold text-copy-primary tabular-nums">
                ~{(metrics.totalStraw * 14).toFixed(0)} kg PM2.5
              </p>
              <p className="text-[10px] text-copy-secondary">Smog Emissions Prevented</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-surface border border-surface-border text-copy-primary shrink-0">
              <UserCheck className="w-4 h-4 text-copy-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-copy-primary tabular-nums">
                {metrics.uniqueFarmersCount} Families
              </p>
              <p className="text-[10px] text-copy-secondary">{t('ngo.stat_farmers_aided', 'Farmers Supported')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task-Oriented Tab Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-surface-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'requests'
              ? 'bg-brand text-on-brand shadow-xs'
              : 'bg-surface text-copy-secondary hover:bg-bg-subtle border border-surface-border'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t('ngo.tab_requests', 'Field Requests')}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              metrics.pendingCount > 0
                ? 'bg-state-warning-dim text-state-warning border border-state-warning/30'
                : 'bg-bg-subtle text-copy-secondary'
            }`}
          >
            {requests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('machinery')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'machinery'
              ? 'bg-brand text-on-brand shadow-xs'
              : 'bg-surface text-copy-secondary hover:bg-bg-subtle border border-surface-border'
          }`}
        >
          <Tractor className="w-3.5 h-3.5" />
          <span>{t('ngo.tab_machinery', 'Machinery Disbursements')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-bg-subtle text-copy-secondary">
            {disbursements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'ledger'
              ? 'bg-brand text-on-brand shadow-xs'
              : 'bg-surface text-copy-secondary hover:bg-bg-subtle border border-surface-border'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>{t('ngo.tab_ledger', 'Audit Ledger')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('telemetry')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'telemetry'
              ? 'bg-brand text-on-brand shadow-xs'
              : 'bg-surface text-copy-secondary hover:bg-bg-subtle border border-surface-border'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t('ngo.tab_alerts', 'Ground Alerts')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-bg-subtle text-copy-secondary">
            {notifications.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: FIELD CLEARANCE REQUESTS                           */}
      {/* ======================================================== */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-surface-border rounded-2xl p-4 shadow-xs">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setRequestFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  requestFilter === 'all'
                    ? 'bg-brand text-on-brand'
                    : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
                }`}
              >
                {t('ngo.filter_all', 'All')} ({requests.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  requestFilter === 'pending'
                    ? 'bg-brand text-on-brand'
                    : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
                }`}
              >
                {t('ngo.filter_pending', 'Pending Review')} ({metrics.pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  requestFilter === 'approved'
                    ? 'bg-brand text-on-brand'
                    : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
                }`}
              >
                {t('ngo.filter_approved', 'Approved & Ready')} ({metrics.approvedCount})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter('declined')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  requestFilter === 'declined'
                    ? 'bg-brand text-on-brand'
                    : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
                }`}
              >
                {t('ngo.filter_declined', 'Declined')} ({metrics.declinedCount})
              </button>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-copy-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ngo.search_requests_placeholder', 'Search by farmer, village, or purpose...')}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-surface-border bg-bg-subtle text-copy-primary text-xs outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
            </div>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-2xl p-10 text-center space-y-2 shadow-xs">
              <FileText className="w-8 h-8 text-copy-muted mx-auto opacity-50" />
              <p className="text-sm font-semibold text-copy-primary">
                {requests.length === 0
                  ? t('ngo.no_requests', 'No assistance requests found.')
                  : t('ngo.no_matching_requests', 'No requests match the selected filter.')}
              </p>
              <p className="text-xs text-copy-secondary">
                When smallholders submit requests through their dashboard or WhatsApp, they will appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const acres = req.listings?.plots?.acres ?? req.listings?.acres ?? 0
                const villageName = req.listings?.plots?.villages?.name
                const farmerPhone = req.farmers?.profiles?.phone
                const isDeployOpen = expandedDeployId === req.id
                const estStraw = req.listings?.est_tonnes ?? (acres > 0 ? acres * 2.2 : 0)

                return (
                  <div
                    key={req.id}
                    className="bg-surface border border-surface-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs transition-shadow hover:shadow-sm"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-copy-primary text-base">
                            {req.farmers?.profiles?.name || t('ngo.local_farmer', 'Local Farmer')}
                          </h4>

                          {/* Status Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              req.status === 'approved'
                                ? 'bg-state-success-dim text-state-success border border-state-success/20'
                                : req.status === 'declined'
                                ? 'bg-state-error-dim text-state-error border border-state-error/20'
                                : 'bg-state-warning-dim text-state-warning border border-state-warning/20'
                            }`}
                          >
                            {req.status === 'pending'
                              ? t('ngo.filter_pending', 'Pending Review')
                              : req.status === 'approved'
                              ? t('ngo.filter_approved', 'Approved & Ready')
                              : t('ngo.filter_declined', 'Declined')}
                          </span>

                          {/* Urgent Tag if pending */}
                          {req.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-state-error-dim text-state-error border border-state-error/20">
                              <Flame className="w-3 h-3" />
                              {t('ngo.fire_risk_urgent', 'Urgent Baler Dispatch (48h)')}
                            </span>
                          )}
                        </div>

                        {/* Location and Contact */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-copy-secondary">
                          {villageName && (
                            <span className="inline-flex items-center gap-1 font-medium text-copy-primary">
                              <MapPin className="w-3.5 h-3.5 text-brand" />
                              {villageName}
                            </span>
                          )}
                          {farmerPhone && (
                            <a
                              href={`tel:${farmerPhone}`}
                              className="inline-flex items-center gap-1 text-brand font-medium hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{farmerPhone}</span>
                            </a>
                          )}
                          {req.created_at && (
                            <span className="text-copy-muted">
                              {new Date(req.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Subsidy Goal Pill */}
                      <div className="text-left sm:text-right bg-bg-subtle px-3.5 py-2 rounded-xl border border-surface-border">
                        <span className="text-[10px] font-semibold text-copy-secondary uppercase tracking-wider block">
                          {t('ngo.goal', 'Goal:')}
                        </span>
                        <span className="text-lg font-bold font-display text-copy-primary tabular-nums">
                          ₹{req.amount_requested.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Specs & Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-bg-subtle/50 rounded-xl border border-surface-border text-xs">
                      <div>
                        <span className="text-copy-muted block text-[11px]">Plot Acreage</span>
                        <span className="font-bold text-copy-primary tabular-nums">
                          {acres > 0 ? `${acres} ${t('ngo.acres_unit', 'Acres')}` : 'General Plot'}
                        </span>
                      </div>
                      <div>
                        <span className="text-copy-muted block text-[11px]">{t('ngo.est_straw', 'Est. Straw')}</span>
                        <span className="font-bold text-copy-primary tabular-nums">
                          ~{estStraw.toFixed(1)} {t('ngo.tonnes_unit', 'Tonnes')}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-copy-muted block text-[11px]">{t('ngo.purpose', 'Purpose:')}</span>
                        <span className="font-medium text-copy-primary truncate block" title={req.purpose}>
                          {req.purpose || 'Stubble clearance machinery rental'}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Pending Review */}
                    {req.status === 'pending' && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border">
                        <button
                          type="button"
                          onClick={() => handleAction(req.id, 'approved')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-on-brand rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('ngo.approve', '✓ Approve for Clearance')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(req.id, 'declined')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-surface-border text-copy-secondary rounded-xl text-xs font-semibold hover:bg-bg-subtle transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{t('ngo.decline', '✕ Decline')}</span>
                        </button>
                      </div>
                    )}

                    {/* Actions: Approved - Machinery Deployment Accordion */}
                    {req.status === 'approved' && (
                      <div className="pt-2 border-t border-surface-border space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedDeployId(isDeployOpen ? null : req.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                          >
                            <Tractor className="w-4 h-4 text-brand" />
                            <span>
                              {isDeployOpen
                                ? 'Hide Deployment Form'
                                : t('ngo.baler_deploy_title', 'Deploy Baler & Record Disbursement')}
                            </span>
                            {isDeployOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <span className="text-[11px] font-semibold text-state-success flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ready for machinery deployment
                          </span>
                        </div>

                        {/* Expandable Form */}
                        {isDeployOpen && (
                          <form
                            onSubmit={(e) => handleDisbursement(req, e)}
                            className="space-y-4 pt-3 border-t border-surface-border bg-bg-subtle/70 p-4 sm:p-5 rounded-2xl"
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-copy-primary">
                                {t('ngo.baler_deploy_title', 'Deploy Baler & Record Disbursement')}
                              </p>
                              <p className="text-[11px] text-copy-secondary">
                                {t(
                                  'ngo.baler_deploy_sub',
                                  'Directly compensate baler operators or logistics haulers to ensure stubble is cleared without fire.'
                                )}
                              </p>
                            </div>

                            {/* Insufficient Working Capital Warning */}
                            {req.amount_requested > ledger.balance && (
                              <div className="p-3 rounded-xl bg-state-warning-dim border border-state-warning/30 text-xs text-state-warning flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>
                                  {t(
                                    'ngo.insufficient_balance_warning',
                                    'Warning: Requested payout exceeds current working fund (₹{{balance}}). Inflow donation required.',
                                    { balance: ledger.balance.toLocaleString() }
                                  )}
                                </span>
                              </div>
                            )}

                            <div className="grid gap-3 sm:grid-cols-4">
                              {/* Payee Type */}
                              <div>
                                <label className="text-[11px] font-semibold text-copy-secondary block mb-1">
                                  {t('ngo.payee_type', 'Payee Type')}
                                </label>
                                <select
                                  name="payee_type"
                                  defaultValue="baler"
                                  className="w-full border border-surface-border rounded-xl px-3 py-2 text-xs bg-surface text-copy-primary outline-none focus:ring-2 focus:ring-brand font-medium"
                                >
                                  <option value="baler">
                                    🚜 {t('ngo.payee_type_baler', 'Baler / Machinery Operator')}
                                  </option>
                                  <option value="transport provider">
                                    🚚 {t('ngo.payee_type_transport', 'Transport / Hauler')}
                                  </option>
                                  <option value="farmer">
                                    🌾 {t('ngo.payee_type_farmer', 'Farmer Direct Incentive')}
                                  </option>
                                </select>
                              </div>

                              {/* Payee Name */}
                              <div>
                                <label className="text-[11px] font-semibold text-copy-secondary block mb-1">
                                  {t('ngo.payee_name', 'Payee Name')}
                                </label>
                                <input
                                  name="payee_name"
                                  required
                                  placeholder="e.g. Majha Custom Hiring Centre"
                                  className="w-full border border-surface-border rounded-xl px-3 py-2 text-xs bg-surface text-copy-primary outline-none focus:ring-2 focus:ring-brand"
                                />
                              </div>

                              {/* Amount */}
                              <div>
                                <label className="text-[11px] font-semibold text-copy-secondary block mb-1">
                                  {t('ngo.amount_label', 'Amount (₹)')}
                                </label>
                                <input
                                  name="amount"
                                  type="number"
                                  required
                                  min="1"
                                  defaultValue={req.amount_requested}
                                  className="w-full border border-surface-border rounded-xl px-3 py-2 text-xs bg-surface text-copy-primary outline-none focus:ring-2 focus:ring-brand font-bold"
                                />
                              </div>

                              {/* Notes */}
                              <div>
                                <label className="text-[11px] font-semibold text-copy-secondary block mb-1">
                                  {t('ngo.note_label', 'Notes / Verification Ref')}
                                </label>
                                <input
                                  name="note"
                                  placeholder={t('ngo.note_placeholder', 'e.g. Field baled without burning')}
                                  className="w-full border border-surface-border rounded-xl px-3 py-2 text-xs bg-surface text-copy-primary outline-none focus:ring-2 focus:ring-brand"
                                />
                              </div>
                            </div>

                            {/* Form Submit Row */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-border/60">
                              <span className="text-[11px] text-copy-muted">
                                Transaction will be stamped into the public audit ledger.
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedDeployId(null)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-surface-border bg-surface text-copy-secondary hover:bg-bg-subtle"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={submittingReqId === req.id}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-on-brand rounded-xl text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>{t('ngo.record_btn', 'Record Disbursement')}</span>
                                </button>
                              </div>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MACHINERY DISBURSEMENTS BREAKDOWN                  */}
      {/* ======================================================== */}
      {activeTab === 'machinery' && (
        <div className="space-y-4">
          {/* Breakdown Card */}
          <div className="bg-surface border border-surface-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-copy-primary flex items-center gap-2">
              <Tractor className="w-5 h-5 text-brand" />
              <span>{t('ngo.breakdown_title', 'Disbursements by Payee Type')}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-bg-subtle border border-surface-border space-y-1">
                <span className="text-xs font-semibold text-copy-secondary flex items-center gap-1.5">
                  <Tractor className="w-4 h-4 text-brand" />
                  {t('ngo.breakdown_baler', 'Baler Operators')}
                </span>
                <p className="text-xl font-bold font-display text-state-error tabular-nums">
                  ₹{metrics.balerTotal.toLocaleString()}
                </p>
                <p className="text-[11px] text-copy-muted">Custom Hiring Centres & Tractor Balers</p>
              </div>

              <div className="p-4 rounded-xl bg-bg-subtle border border-surface-border space-y-1">
                <span className="text-xs font-semibold text-copy-secondary flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-copy-primary" />
                  {t('ngo.breakdown_transport', 'Transport / Hauler')}
                </span>
                <p className="text-xl font-bold font-display text-state-error tabular-nums">
                  ₹{metrics.transportTotal.toLocaleString()}
                </p>
                <p className="text-[11px] text-copy-muted">Trolley transport to bio-pellet depots</p>
              </div>

              <div className="p-4 rounded-xl bg-bg-subtle border border-surface-border space-y-1">
                <span className="text-xs font-semibold text-copy-secondary flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-state-success" />
                  {t('ngo.breakdown_farmer', 'Farmer Incentives')}
                </span>
                <p className="text-xl font-bold font-display text-state-error tabular-nums">
                  ₹{metrics.farmerTotal.toLocaleString()}
                </p>
                <p className="text-[11px] text-copy-muted">Direct marginal farmer clearance subsidies</p>
              </div>
            </div>
          </div>

          {/* Disbursements List Table */}
          <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-copy-primary">
                  {t('ngo.tab_disbursements', 'Disbursements ({{count}})', { count: disbursements.length })}
                </h4>
                <p className="text-xs text-copy-secondary">
                  Complete audit trail of verified machinery payouts funded by clean air donors.
                </p>
              </div>
            </div>

            {disbursements.length === 0 ? (
              <div className="p-8 text-center text-copy-secondary text-xs">
                {t('ngo.no_disbursements', 'No disbursements recorded yet.')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border text-copy-secondary">
                      <th className="pb-2.5 font-semibold">{t('ngo.th_date', 'Date')}</th>
                      <th className="pb-2.5 font-semibold">{t('ngo.th_payee', 'Payee')}</th>
                      <th className="pb-2.5 font-semibold">{t('ngo.th_type', 'Type')}</th>
                      <th className="pb-2.5 font-semibold">{t('ngo.th_notes', 'Notes / Purpose')}</th>
                      <th className="pb-2.5 font-semibold text-right">{t('ngo.th_amount', 'Amount')}</th>
                      <th className="pb-2.5 font-semibold text-right">{t('ngo.th_status', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {disbursements.map((d) => (
                      <tr key={d.id} className="hover:bg-bg-subtle/50 transition-colors">
                        <td className="py-3 text-copy-secondary">
                          {new Date(d.created_at || d.disbursed_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="py-3 font-semibold text-copy-primary">{d.payee_name}</td>
                        <td className="py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-bg-subtle text-copy-primary font-semibold capitalize border border-surface-border">
                            {d.payee_type || 'baler'}
                          </span>
                        </td>
                        <td className="py-3 text-copy-secondary max-w-xs truncate">
                          {d.note || d.assistance_requests?.purpose || 'Field Stubble Clearance'}
                        </td>
                        <td className="py-3 text-right font-bold text-state-error tabular-nums">
                          -₹{d.amount.toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-state-success-dim text-state-success border border-state-success/20">
                            {t('ngo.settled', '✓ Settled')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: AUDITABLE TRANSACTION LEDGER                       */}
      {/* ======================================================== */}
      {activeTab === 'ledger' && (
        <div className="bg-surface border border-surface-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-copy-primary font-display">
                {t('ngo.ledger_title', 'Auditable Transaction Ledger')}
              </h3>
              <p className="text-xs text-copy-secondary max-w-xl">
                {t(
                  'ngo.ledger_sub',
                  'Real-time transparent audit record linking citizen donations to field clearance disbursements.'
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveLedgerTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeLedgerTab === 'all'
                    ? 'bg-brand text-on-brand'
                    : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
                }`}
              >
                {t('ngo.all_transactions', 'All Transactions')} ({disbursements.length + donations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveLedgerTab('disbursements')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeLedgerTab === 'disbursements'
                    ? 'bg-brand text-on-brand'
                    : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
                }`}
              >
                {t('ngo.tab_disbursements', 'Disbursements ({{count}})', { count: disbursements.length })}
              </button>
              <button
                type="button"
                onClick={() => setActiveLedgerTab('donations')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeLedgerTab === 'donations'
                    ? 'bg-brand text-on-brand'
                    : 'bg-bg-subtle text-copy-secondary hover:bg-surface-border'
                }`}
              >
                {t('ngo.tab_donations', 'Donations Inflow ({{count}})', { count: donations.length })}
              </button>
            </div>
          </div>

          {/* Transactions Render */}
          {activeLedgerTab === 'all' ? (
            <div className="space-y-4">
              {/* Dual Summary Metrics */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-bg-subtle/50 rounded-xl border border-surface-border">
                <div>
                  <span className="text-[11px] text-copy-muted block">Total Inflow Ingested</span>
                  <span className="text-lg font-bold text-state-success tabular-nums">
                    +₹{ledger.totalReceived.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-copy-muted block">Total Outflow Deployed</span>
                  <span className="text-lg font-bold text-state-error tabular-nums">
                    -₹{ledger.totalDisbursed.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Combined chronological stream */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border text-copy-secondary">
                      <th className="pb-2.5 font-semibold">{t('ngo.th_date', 'Date')}</th>
                      <th className="pb-2.5 font-semibold">Entity / Beneficiary</th>
                      <th className="pb-2.5 font-semibold">Classification</th>
                      <th className="pb-2.5 font-semibold text-right">{t('ngo.th_amount', 'Amount')}</th>
                      <th className="pb-2.5 font-semibold text-right">{t('ngo.th_verification', 'Verification')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {/* Combine donations and disbursements */}
                    {[
                      ...donations.map((d) => ({
                        id: `don-${d.id}`,
                        date: d.created_at,
                        name: d.donor?.name || t('ngo.anonymous_citizen', 'Anonymous Citizen'),
                        classification: `Inflow • ${d.villages?.name || t('ngo.general_pool', 'Clean Air Pool')}`,
                        amount: d.amount,
                        isInflow: true,
                      })),
                      ...disbursements.map((d) => ({
                        id: `disb-${d.id}`,
                        date: d.created_at || d.disbursed_at || '',
                        name: d.payee_name,
                        classification: `Outflow • ${d.payee_type || 'baler'}`,
                        amount: d.amount,
                        isInflow: false,
                      })),
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                          <td className="py-2.5 text-copy-secondary">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 font-semibold text-copy-primary">{item.name}</td>
                          <td className="py-2.5 text-copy-secondary capitalize">{item.classification}</td>
                          <td
                            className={`py-2.5 text-right font-bold tabular-nums ${
                              item.isInflow ? 'text-state-success' : 'text-state-error'
                            }`}
                          >
                            {item.isInflow ? `+₹${item.amount.toLocaleString()}` : `-₹${item.amount.toLocaleString()}`}
                          </td>
                          <td className="py-2.5 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-state-success-dim text-state-success border border-state-success/20">
                              ✓ Verified
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeLedgerTab === 'disbursements' ? (
            disbursements.length === 0 ? (
              <div className="p-8 text-center text-copy-secondary text-xs">
                {t('ngo.no_disbursements', 'No disbursements recorded yet.')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border text-copy-secondary">
                      <th className="pb-2.5 font-semibold">{t('ngo.th_date', 'Date')}</th>
                      <th className="pb-2.5 font-semibold">{t('ngo.th_payee', 'Payee')}</th>
                      <th className="pb-2.5 font-semibold">{t('ngo.th_type', 'Type')}</th>
                      <th className="pb-2.5 font-semibold text-right">{t('ngo.th_amount', 'Amount')}</th>
                      <th className="pb-2.5 font-semibold text-right">{t('ngo.th_status', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {disbursements.map((d) => (
                      <tr key={d.id} className="hover:bg-bg-subtle/50 transition-colors">
                        <td className="py-2.5 text-copy-secondary">
                          {new Date(d.created_at || d.disbursed_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 font-semibold text-copy-primary">{d.payee_name}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-bg-subtle text-copy-primary font-medium capitalize border border-surface-border">
                            {d.payee_type || 'baler'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-state-error tabular-nums">
                          -₹{d.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-state-success-dim text-state-success border border-state-success/20">
                            {t('ngo.settled', '✓ Settled')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            donations.length === 0 ? (
              <div className="p-8 text-center text-copy-secondary text-xs">
                {t('ngo.no_donations', 'No donations received yet.')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border text-copy-secondary">
                      <th className="pb-2.5 font-semibold">{t('ngo.th_date', 'Date')}</th>
                      <th className="pb-2.5 font-semibold">{t('ngo.th_donor', 'Donor / Source')}</th>
                      <th className="pb-2.5 font-semibold">{t('ngo.th_target_village', 'Target Village')}</th>
                      <th className="pb-2.5 font-semibold text-right">{t('ngo.th_amount', 'Amount')}</th>
                      <th className="pb-2.5 font-semibold text-right">{t('ngo.th_verification', 'Verification')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {donations.map((don) => (
                      <tr key={don.id} className="hover:bg-bg-subtle/50 transition-colors">
                        <td className="py-2.5 text-copy-secondary">
                          {new Date(don.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 font-semibold text-copy-primary">
                          {don.donor?.name || t('ngo.anonymous_citizen', 'Anonymous Citizen')}
                        </td>
                        <td className="py-2.5 text-copy-secondary">
                          {don.villages?.name || t('ngo.general_pool', 'General Clean Air Pool')}
                        </td>
                        <td className="py-2.5 text-right font-bold text-state-success tabular-nums">
                          +₹{don.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-state-success-dim text-state-success border border-state-success/20">
                            {t('ngo.verified', 'Verified')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Non-Profit Guarantee Stamp */}
          <div className="pt-3 border-t border-surface-border text-center text-xs text-copy-muted">
            <p>
              🛡️{' '}
              {t(
                'ngo.audit_guarantee',
                '100% of citizen funds are traceable to field machinery receipts and verified satellite stubble clearance coordinates.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MISSION TELEMETRY & NOTIFICATIONS                  */}
      {/* ======================================================== */}
      {activeTab === 'telemetry' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-copy-primary">
              {t('ngo.notifications_title', 'Activity Notifications')}
            </h3>
            <span className="text-xs text-copy-secondary font-medium">
              Real-time ground dispatch & donation alerts
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-2xl p-8 text-center text-xs text-copy-secondary shadow-xs">
              <Clock className="w-6 h-6 text-copy-muted mx-auto mb-2 opacity-50" />
              {t('ngo.no_notifications', 'No new notifications.')}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs space-y-2 hover:border-brand/40 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-brand/10 text-brand shrink-0 mt-0.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-copy-primary leading-relaxed font-medium">{n.message}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-copy-muted pt-1 border-t border-surface-border/50">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-state-success uppercase">Active Log</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
