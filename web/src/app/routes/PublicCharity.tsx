import { Link } from 'react-router-dom'
import { ArrowLeft, HeartHandshake, LogIn } from 'lucide-react'
import { DonorDashboard } from '@/features/charity/components/DonorDashboard'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function PublicCharity() {
  const { session } = useAuth()
  const currentUserId = session?.user.id || '3e661c35-1c37-45fd-8143-72a68beca858'

  return (
    <div className="min-h-screen bg-base text-copy-primary">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-copy-secondary hover:text-copy-primary transition-colors py-1 px-2.5 rounded-lg border border-surface-border bg-surface"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <div className="h-4 w-px bg-surface-border hidden sm:block" />
            <Link to="/" className="font-display text-xl tracking-tight text-copy-primary">
              ResidueLoop
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand/15 text-brand font-semibold hidden md:inline-block border border-brand/20">
              Citizen Clean Air Charity
            </span>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <Link
                to="/app"
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand text-on-brand px-3.5 py-2 rounded-xl hover:bg-brand/90 transition-all shadow-xs"
              >
                <span>Go to Dashboard</span>
                <span>➔</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-copy-muted hidden sm:inline">
                  Contributing as Global Citizen Donor
                </span>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border border-surface-border bg-surface text-copy-primary hover:bg-bg-subtle px-3 py-2 rounded-xl transition-all shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Farmer / Buyer Login</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand tracking-wide uppercase">
            <HeartHandshake className="w-4 h-4" />
            <span>Global Citizen Anti-Burning Crowdfunding Portal</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-copy-primary tracking-tight">
            Rescue Unsold Paddy Stubble &amp; Stop Fire Pollution
          </h1>
          <p className="text-sm text-copy-secondary max-w-3xl">
            When industrial buyers don&apos;t purchase a farmer&apos;s stubble within 2–3 days, farmers face urgent pressure to burn their fields for wheat sowing. Global citizens can crowdfund machine clearance costs here—our system automatically calls a nearby NGO with balers to clear the crop cleanly!
          </p>
        </div>

        {/* Reusable Donor Dashboard / Charity Engine */}
        <DonorDashboard userId={currentUserId} isPublicView={!session} />
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border mt-16 py-8 text-center text-xs text-copy-muted bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-copy-primary">ResidueLoop Citizen Clean Air Initiative</p>
          <p>
            Operating with verified NGO partner <strong>Punjab Clean Air &amp; Bio-Energy Action</strong>. Payments processed via Stripe Dummy Test Gateway.
          </p>
        </div>
      </footer>
    </div>
  )
}
