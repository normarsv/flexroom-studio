import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import { BRAND } from '@/lib/constants'

export default function Footer() {
  const t = useTranslations('footer')

  return (
    <footer className="bg-[#1E1E1E] text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-heading font-black text-xl text-[#F4EF71] lowercase mb-1">{BRAND.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">Fit Social Hub</p>
            <p className="text-white/60 text-sm">
              {BRAND.tagline_es}
            </p>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-start gap-2 text-sm text-white/60">
              <FontAwesomeIcon icon={faLocationDot} className="w-4 h-4 mt-0.5 shrink-0 text-[#F4EF71]" />
              <span>{t('address')}</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2 text-sm">
            <a
              href={BRAND.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-[#F4EF71] transition-colors"
            >
              @flexroomstudio
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-white/30">
          <span>© {new Date().getFullYear()} {BRAND.name} {t('rights')}.</span>
        </div>
      </div>
    </footer>
  )
}
