import { ArrowDownRight, ArrowUpRight, Factory, HeartHandshake, Leaf, MapPin, ShieldCheck, Truck, Wheat } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FieldIllustration } from '@/components/common/FieldIllustration'
import { LanguageSwitch } from '@/components/common/LanguageSwitch'

const roles = [
  { key: 'farmer', icon: Wheat },
  { key: 'buyer', icon: Factory },
  { key: 'donor', icon: HeartHandshake },
] as const

const steps = [
  { key: 'list', icon: MapPin },
  { key: 'match', icon: Truck },
  { key: 'verify', icon: ShieldCheck },
] as const

export function Landing() {
  const { t } = useTranslation()

  return (
    <div className="landing-page min-h-screen overflow-hidden bg-base text-copy-primary">
      <header className="landing-nav">
        <Link to="/" className="font-display text-2xl tracking-tight" aria-label={t('landing.home_label')}>
          {t('auth.brand')}
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex" aria-label={t('landing.primary_navigation')}>
          <a href="#how-it-works">{t('landing.nav_how')}</a>
          <a href="#for-everyone">{t('landing.nav_roles')}</a>
          <a href="#impact">{t('landing.nav_impact')}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitch compact />
          <Link to="/login" className="landing-button landing-button--dark hidden sm:inline-flex">
            {t('landing.login')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy landing-reveal">
            <p className="landing-eyebrow">{t('landing.eyebrow')}</p>
            <h1>{t('landing.title')}</h1>
            <p className="landing-hero__lede">{t('landing.lede')}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/login" className="landing-button landing-button--brand">
                {t('landing.primary_cta')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className="landing-button landing-button--ghost">
                {t('landing.secondary_cta')} <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="landing-hero__art landing-reveal" aria-hidden="true">
            <FieldIllustration className="field-illustration" />
            <p className="landing-hero__art-caption">{t('landing.art_caption')}</p>
          </div>
        </section>
        <div className="landing-marquee" aria-hidden="true"><div className="landing-marquee__track">{[0, 1].map((copy) => <span key={copy}>{t('landing.marquee')}</span>)}</div></div>
        <section id="how-it-works" className="landing-section landing-section--steps">
          <div className="landing-section__intro landing-reveal"><p className="landing-eyebrow">{t('landing.process_eyebrow')}</p><h2>{t('landing.process_title')}</h2></div>
          <div className="landing-steps">
            {steps.map(({ key, icon: Icon }, index) => (
              <article className="landing-step landing-reveal" key={key}>
                <span className="landing-step__number">0{index + 1}</span><Icon className="h-7 w-7" aria-hidden="true" />
                <h3>{t(`landing.steps.${key}.title`)}</h3><p>{t(`landing.steps.${key}.body`)}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="for-everyone" className="landing-section landing-section--roles">
          <div className="landing-section__intro landing-reveal"><p className="landing-eyebrow">{t('landing.roles_eyebrow')}</p><h2>{t('landing.roles_title')}</h2></div>
          <div className="landing-roles">
            {roles.map(({ key, icon: Icon }) => (
              <article className="landing-role landing-reveal" key={key}>
                <Icon className="h-8 w-8" aria-hidden="true" /><h3>{t(`landing.roles.${key}.title`)}</h3><p>{t(`landing.roles.${key}.body`)}</p>
                <Link to="/login" className="landing-text-link">{t('landing.roles.cta')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </section>
        <section id="impact" className="landing-impact">
          <Leaf className="landing-impact__mark" aria-hidden="true" />
          <div className="landing-impact__content landing-reveal"><p className="landing-eyebrow">{t('landing.impact_eyebrow')}</p><h2>{t('landing.impact_title')}</h2><p>{t('landing.impact_body')}</p>
            <Link to="/login" className="landing-button landing-button--brand">{t('landing.impact_cta')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer"><span className="font-display text-xl">{t('auth.brand')}</span><span>{t('landing.footer')}</span></footer>
    </div>
  )
}
