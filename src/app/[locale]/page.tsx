import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt, faLeaf, faSpa, faLocationDot, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { createClient } from '@/lib/supabase/server'
import { HomepageContent } from '@/types'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: homepage } = await supabase.from('homepage_content').select('*').single()
  const t = await getTranslations({ locale, namespace: 'home' })

  return <HomeContent locale={locale} homepage={homepage} t={t} />
}

function HomeContent({
  locale,
  homepage,
  t,
}: {
  locale: string
  homepage: HomepageContent | null
  t: any
}) {
  const heroSubtitle =
    (locale === 'es' ? homepage?.hero_subtitle_es : homepage?.hero_subtitle_en) ||
    t('hero_subtitle')
  const aboutText =
    (locale === 'es' ? homepage?.about_text_es : homepage?.about_text_en) ||
    t('about_text')
  const heroImageUrl = homepage?.hero_image_url || null
  const aboutImageUrl = homepage?.about_image_url || null

  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden px-4">

        {/* Organic circles — brand gradient blobs */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          <svg
            className="absolute -top-24 -right-24 w-[520px] h-[520px]"
            viewBox="0 0 520 520"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="hg1" cx="38%" cy="38%" r="62%" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F4EF71" stopOpacity="0.75" />
                <stop offset="55%" stopColor="#D9D78A" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#C8C8C8" stopOpacity="0.05" />
              </radialGradient>
            </defs>
            <circle cx="260" cy="260" r="260" fill="url(#hg1)" />
          </svg>

          <svg
            className="absolute -bottom-16 -left-16 w-[340px] h-[340px]"
            viewBox="0 0 340 340"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="hg2" cx="55%" cy="60%" r="55%" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F4EF71" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#C8C8C8" stopOpacity="0.05" />
              </radialGradient>
            </defs>
            <circle cx="170" cy="170" r="170" fill="url(#hg2)" />
          </svg>
        </div>

        {/* Hero content */}
        <div className={`relative z-10 text-center max-w-5xl mx-auto w-full ${heroImageUrl ? 'flex flex-col lg:flex-row items-center gap-12 text-left' : ''}`}>

          <div className={heroImageUrl ? 'flex-1' : 'max-w-3xl mx-auto'}>
            {/* Location pill */}
            <div className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border/70 rounded-full px-3 py-1.5 mb-10 bg-background/60 backdrop-blur-sm ${heroImageUrl ? '' : 'mx-auto'}`}>
              <FontAwesomeIcon icon={faLocationDot} className="w-3 h-3 text-[#F4EF71]" />
              San Cristóbal de las Casas, Chiapas
            </div>

            {/* Logo / main headline */}
            <h1
              className="font-heading font-black lowercase leading-[0.9] tracking-tight text-foreground mb-4"
              style={{ fontSize: 'clamp(3.5rem, 13vw, 8.5rem)' }}
            >
              flexroom.
            </h1>

            {/* Sub-tagline */}
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-8">
              Fit Social Hub
            </p>

            {/* Description */}
            <p className={`text-base md:text-lg text-muted-foreground leading-relaxed mb-10 ${heroImageUrl ? 'max-w-lg' : 'max-w-md mx-auto'}`}>
              {heroSubtitle}
            </p>

            {/* CTAs */}
            <div className={`flex flex-col sm:flex-row items-center gap-3 ${heroImageUrl ? '' : 'justify-center'}`}>
              <Link href="./classes">
                <Button
                  size="lg"
                  className="rounded-full bg-[#1E1E1E] text-white hover:bg-[#1E1E1E]/80 font-semibold px-8 gap-2"
                >
                  {t('hero_cta')}
                  <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                </Button>
              </Link>
              <Link href="./packages">
                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary px-8"
                >
                  {t('hero_cta_secondary')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero image — shown only when set from admin */}
          {heroImageUrl && (
            <div className="relative w-full max-w-sm lg:max-w-md shrink-0 aspect-square rounded-3xl overflow-hidden">
              <Image src={heroImageUrl} alt="Flexroom Studio" fill className="object-cover" />
            </div>
          )}
        </div>

        {/* Scroll line */}
        {!heroImageUrl && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" aria-hidden>
            <div className="w-px h-14 bg-gradient-to-b from-transparent via-border to-transparent" />
          </div>
        )}
      </section>

      {/* ── DISCIPLINES ──────────────────────────────────────── */}
      <section className="relative py-24 px-4 overflow-hidden bg-secondary/30">

        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 pointer-events-none select-none" aria-hidden>
          <svg className="w-[320px] h-[320px] opacity-[0.18]" viewBox="0 0 320 320">
            <defs>
              <radialGradient id="dg1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F4EF71" />
                <stop offset="100%" stopColor="#C8C8C8" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="160" cy="160" r="160" fill="url(#dg1)" />
          </svg>
        </div>
        <div className="absolute -left-16 -bottom-16 pointer-events-none select-none" aria-hidden>
          <svg className="w-[240px] h-[240px] opacity-[0.12]" viewBox="0 0 240 240">
            <defs>
              <radialGradient id="dg2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F4EF71" />
                <stop offset="100%" stopColor="#C8C8C8" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="120" cy="120" r="120" fill="url(#dg2)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">

          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-3 text-center">
            {t('disciplines_title')}
          </p>
          <h2 className="font-heading font-extrabold text-3xl text-foreground lowercase text-center mb-14">
            lo que hacemos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {[
              { num: '01', icon: faBolt,  title: t('funcional_title'), desc: t('funcional_desc') },
              { num: '02', icon: faLeaf,  title: t('reformer_title'),  desc: t('reformer_desc') },
              { num: '03', icon: faSpa,   title: t('barre_title'),     desc: t('barre_desc') },
            ].map((d) => (
              <div
                key={d.num}
                className="group bg-card rounded-3xl border border-border p-8 flex flex-col
                  cursor-default select-none
                  hover:-translate-y-2 hover:shadow-xl hover:border-[#F4EF71]/40
                  transition-all duration-300 ease-out"
              >
                {/* Icon circle */}
                <div
                  className="w-16 h-16 rounded-full bg-[#F4EF71]/15 flex items-center justify-center mb-6
                    group-hover:bg-[#F4EF71] transition-colors duration-300"
                >
                  <FontAwesomeIcon
                    icon={d.icon}
                    className="w-7 h-7 text-[#868686] group-hover:text-[#1E1E1E] transition-colors duration-300"
                  />
                </div>

                {/* Number */}
                <span className="text-[0.6rem] font-bold tracking-[0.2em] text-[#F4EF71] mb-2">
                  {d.num}
                </span>

                {/* Title */}
                <h3 className="font-heading font-extrabold text-2xl text-foreground lowercase mb-3">
                  {d.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {d.desc}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="relative bg-[#1E1E1E] py-20 px-4 overflow-hidden">

        {/* Subtle circle in stats */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center" aria-hidden>
          <svg className="w-[600px] h-[600px] opacity-[0.04]" viewBox="0 0 600 600">
            <defs>
              <radialGradient id="sg1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F4EF71" />
                <stop offset="100%" stopColor="#F4EF71" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="300" cy="300" r="300" fill="url(#sg1)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
            {[
              { value: '9', label: 'Instructoras\ncertificadas' },
              { value: '3', label: 'Disciplinas\nen un solo lugar' },
              { value: '50', label: 'Minutos de clase\nenfocada' },
            ].map((s) => (
              <div key={s.value} className="text-center py-8 sm:py-0">
                <p className="font-heading font-black text-[3.5rem] leading-none text-[#F4EF71] mb-2">{s.value}</p>
                <p className="text-white/40 text-xs leading-snug whitespace-pre-line">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────────── */}
      <section className="relative py-24 px-4 overflow-hidden">

        {/* Background circle — centered, very subtle */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center" aria-hidden>
          <svg className="w-[500px] h-[500px] opacity-[0.12]" viewBox="0 0 500 500">
            <defs>
              <radialGradient id="ag1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F4EF71" />
                <stop offset="100%" stopColor="#C8C8C8" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="250" cy="250" r="250" fill="url(#ag1)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          {aboutImageUrl ? (
            /* Two-column layout when image is set */
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="relative w-full max-w-xs lg:max-w-sm shrink-0 aspect-[4/5] rounded-3xl overflow-hidden">
                <Image src={aboutImageUrl} alt="Sobre flexroom" fill className="object-cover" />
              </div>
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-6">
                  {t('about_title')}
                </p>
                <p className="text-xl md:text-2xl text-foreground leading-relaxed font-light">
                  {aboutText}
                </p>
              </div>
            </div>
          ) : (
            /* Centered layout when no image */
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-6">
                {t('about_title')}
              </p>
              <p className="text-xl md:text-2xl text-foreground leading-relaxed font-light">
                {aboutText}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-secondary/40 border-t border-border">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-heading font-black text-4xl md:text-5xl text-foreground lowercase mb-3">
            {t('cta_title')}
          </h2>
          <p className="text-muted-foreground mb-8 text-base">{t('cta_text')}</p>
          <Link href="./classes">
            <Button
              size="lg"
              className="rounded-full bg-[#1E1E1E] text-white hover:bg-[#1E1E1E]/80 font-bold px-10 gap-2"
            >
              {t('cta_button')}
              <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  )
}
