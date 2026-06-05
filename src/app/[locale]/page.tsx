import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import DisciplineCard from '@/components/home/DisciplineCard'

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  return <HomeContent params={params} />
}

function HomeContent({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('home')
  const tNav = useTranslations('nav')

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-pattern.svg')] bg-repeat" />
        <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
          <p className="text-primary-foreground/70 text-sm uppercase tracking-widest mb-4 font-medium">
            Flex Room Studio
          </p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            {t('hero_title')}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-xl mx-auto leading-relaxed">
            {t('hero_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="./classes">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8">
                {t('hero_cta')}
              </Button>
            </Link>
            <Link href="./packages">
              <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 px-8">
                {t('hero_cta_secondary')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary mb-6">{t('about_title')}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t('about_text')}
          </p>
        </div>
      </section>

      {/* Disciplines */}
      <section className="py-16 px-4 bg-secondary/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">
            {t('disciplines_title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DisciplineCard
              title={t('funcional_title')}
              description={t('funcional_desc')}
              tag="Para los intensos"
              icon="⚡"
            />
            <DisciplineCard
              title={t('reformer_title')}
              description={t('reformer_desc')}
              tag="Pilates"
              icon="🌿"
              featured
            />
            <DisciplineCard
              title={t('barre_title')}
              description={t('barre_desc')}
              tag="Yoga · Pilates · Ballet"
              icon="🩰"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-primary mb-3">{t('cta_title')}</h2>
          <p className="text-muted-foreground mb-8 text-lg">{t('cta_text')}</p>
          <Link href="./classes">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-10">
              {t('cta_button')}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
