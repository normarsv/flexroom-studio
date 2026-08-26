'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faXmark, faGlobe, faDownload } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

export default function Navbar({ locale }: { locale: string }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string; isAdmin?: boolean } | null>(null)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (isIOS) { setShowIOSInstructions(true); return }
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
  }

  const showInstallButton = !isInstalled && (installPrompt || isIOS)

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

  if (pathname.includes('/admin')) return null

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
    <>
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
            {showInstallButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstall}
                className="gap-1.5 text-primary"
              >
                <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5" />
                Instalar app
              </Button>
            )}
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
              {showInstallButton && (
                <button
                  onClick={() => { handleInstall(); setMenuOpen(false) }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary"
                >
                  <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                  Instalar app
                </button>
              )}
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

      {/* iOS install instructions modal — outside <header> to avoid backdrop-filter clipping fixed position */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-primary text-lg">Instalar app</h2>
              <button onClick={() => setShowIOSInstructions(false)} className="text-muted-foreground hover:text-primary p-1">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Sigue estos pasos para agregar flexroom a tu pantalla de inicio:</p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                <span className="text-primary">Toca el botón <strong>Compartir</strong> <span className="inline-block">⎙</span> en la barra de Safari (abajo o arriba según tu iPhone)</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                <span className="text-primary">Desplázate y toca <strong>&quot;Agregar a pantalla de inicio&quot;</strong></span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                <span className="text-primary">Toca <strong>Agregar</strong> — ¡listo!</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}
