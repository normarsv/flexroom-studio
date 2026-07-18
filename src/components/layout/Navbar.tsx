'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faXmark, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

export default function Navbar({ locale }: { locale: string }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string; isAdmin?: boolean } | null>(null)

  // Check auth on mount
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()
        if (!cancelled) setUser({ email: session.user.email, isAdmin: profile?.is_admin })
      }
    })
    return () => { cancelled = true }
  }, [])

  const otherLocale = locale === 'es' ? 'en' : 'es'
  const switchLocale = () => {
    const segments = pathname.split('/')
    segments[1] = otherLocale
    router.push(segments.join('/'))
  }

  const navLinks = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/classes`, label: t('classes') },
    { href: `/${locale}/packages`, label: t('packages') },
    { href: `/${locale}/coaches`, label: t('coaches') },
    { href: `/${locale}/gallery`, label: t('gallery') },
  ]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${locale}`} className="font-heading font-black text-xl text-muted-foreground tracking-tight lowercase">
            {BRAND.name}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#1E1E1E] bg-[#F4EF71]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={switchLocale}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <FontAwesomeIcon icon={faGlobe} className="w-4 h-4" />
              {otherLocale.toUpperCase()}
            </Button>

            {user ? (
              <>
                {user.isAdmin && (
                  <Link href={`/${locale}/admin`}>
                    <Button variant="outline" size="sm">{t('admin')}</Button>
                  </Link>
                )}
                <Link href={`/${locale}/account`}>
                  <Button variant="outline" size="sm">{t('account')}</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>{t('logout')}</Button>
              </>
            ) : (
              <Link href={`/${locale}/login`}>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/80 font-semibold">
                  {t('login')}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <FontAwesomeIcon icon={faXmark} className="w-5 h-5" /> : <FontAwesomeIcon icon={faBars} className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'text-[#1E1E1E] bg-[#F4EF71]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="pt-2 flex flex-col gap-2 border-t border-border">
              <button
                onClick={() => { switchLocale(); setMenuOpen(false) }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground"
              >
                <FontAwesomeIcon icon={faGlobe} className="w-4 h-4" />
                {otherLocale === 'es' ? 'Español' : 'English'}
              </button>
              {user ? (
                <>
                  <Link href={`/${locale}/account`} onClick={() => setMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">{t('account')}</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full">{t('logout')}</Button>
                </>
              ) : (
                <Link href={`/${locale}/login`} onClick={() => setMenuOpen(false)}>
                  <Button size="sm" className="w-full bg-primary text-primary-foreground font-semibold">{t('login')}</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
