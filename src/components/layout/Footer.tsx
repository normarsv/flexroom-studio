'use client'

import { useTranslations } from 'next-intl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { BRAND } from '@/lib/constants'
import { StudioSettings } from '@/types'

interface Props {
  settings: StudioSettings | null
}

export default function Footer({ settings }: Props) {
  const t = useTranslations('footer')

  const tagline = settings?.footer_tagline_es || BRAND.tagline_es
  const address = settings?.footer_address || t('address')
  const instagram = settings?.footer_instagram || BRAND.instagram
  const email = settings?.footer_email || BRAND.email
  const phone = settings?.footer_phone || null

  const instagramHandle = instagram.replace(/.*instagram\.com\//, '').replace(/\/$/, '')

  return (
    <footer className="bg-[#1E1E1E] text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-heading font-black text-xl text-[#F4EF71] lowercase mb-1">{BRAND.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">Fit Social Hub</p>
            <p className="text-white/60 text-sm">{tagline}</p>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            {address && (
              <div className="flex items-start gap-2 text-sm text-white/60">
                <FontAwesomeIcon icon={faLocationDot} className="w-4 h-4 mt-0.5 shrink-0 text-[#F4EF71]" />
                <span>{address}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-2 text-sm text-white/60">
                <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 shrink-0 text-[#F4EF71]" />
                <a href={`mailto:${email}`} className="hover:text-[#F4EF71] transition-colors">{email}</a>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2 text-sm text-white/60">
                <FontAwesomeIcon icon={faPhone} className="w-4 h-4 shrink-0 text-[#F4EF71]" />
                <a href={`tel:${phone}`} className="hover:text-[#F4EF71] transition-colors">{phone}</a>
              </div>
            )}
          </div>

          {/* Social */}
          <div className="flex flex-col gap-2 text-sm">
            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-[#F4EF71] transition-colors"
              >
                <FontAwesomeIcon icon={faInstagram} className="w-4 h-4" />
                @{instagramHandle}
              </a>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-white/30">
          <span>© {new Date().getFullYear()} {BRAND.name} {t('rights')}.</span>
        </div>
      </div>
    </footer>
  )
}
