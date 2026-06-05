import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { BRAND } from '@/lib/constants'

export default function Footer() {
  const t = useTranslations('footer')

  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-bold text-lg mb-2">{BRAND.name}</h3>
            <p className="text-primary-foreground/70 text-sm">
              {BRAND.tagline_es}
            </p>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-start gap-2 text-sm text-primary-foreground/80">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{t('address')}</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2 text-sm">
            <a
              href={BRAND.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              @flexroomstudio
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-primary-foreground/20 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-primary-foreground/60">
          <span>© {new Date().getFullYear()} {BRAND.name}. {t('rights')}.</span>
        </div>
      </div>
    </footer>
  )
}
