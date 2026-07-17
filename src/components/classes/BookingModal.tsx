'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { format, parseISO } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { ClassSession, UserPackage } from '@/types'
import { CLASS_TYPE_LABELS, SINGLE_SESSION_PRICES_MXN } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

interface Props {
  session: ClassSession
  locale: string
  userId: string | null
  userPackages: UserPackage[]
  onClose: () => void
}

export default function BookingModal({ session, locale, userId, userPackages, onClose }: Props) {
  const t = useTranslations('classes')
  const dateLocale = locale === 'es' ? es : enUS
  const [loading, setLoading] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [selectedPackage, setSelectedPackage] = useState<string | null>(
    userPackages[0]?.id || null
  )

  const classLabel = CLASS_TYPE_LABELS[session.class_type]
  const date = parseISO(session.date)

  // Filter packages compatible with this class type
  const compatiblePackages = userPackages.filter((up) => {
    if (!up.package) return false
    if (!up.package.allowed_class_types) return true // null = all
    return up.package.allowed_class_types.includes(session.class_type)
  })

  const [singleLoading, setSingleLoading] = useState(false)

  async function handleBuySingle() {
    setSingleLoading(true)
    try {
      const res = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classSessionId: session.id, locale }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error('Error al procesar el pago')
    } catch {
      toast.error('Error al procesar el pago')
    } finally {
      setSingleLoading(false)
    }
  }

  async function handleBook() {
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          userPackageId: userId ? selectedPackage : null,
          guestName: userId ? undefined : guestName,
          guestEmail: userId ? undefined : guestEmail,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || t('error'))
        return
      }

      toast.success(t('booking_confirmed'))
      onClose()
    } catch {
      toast.error('Error al reservar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-primary"
        >
          <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
        </button>

        {/* Session info */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
            {format(date, "EEEE d 'de' MMMM", { locale: dateLocale })}
          </p>
          <h2 className="text-xl font-bold text-primary">
            {locale === 'es' ? classLabel.es : classLabel.en}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {session.start_time.slice(0, 5)} · {session.duration_minutes} min
            {session.instructor && ` · ${session.instructor.name}`}
          </p>
        </div>

        {/* Logged in user */}
        {userId && (
          <>
            {compatiblePackages.length > 0 ? (
              <div className="mb-6">
                <label className="text-sm font-medium text-primary block mb-2">
                  {t('select_package')}
                </label>
                <div className="space-y-2">
                  {compatiblePackages.map((up) => (
                    <button
                      key={up.id}
                      onClick={() => setSelectedPackage(up.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedPackage === up.id
                          ? 'border-primary bg-secondary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="text-sm font-medium text-primary">
                        {locale === 'es' ? up.package?.name_es : up.package?.name_en}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {up.sessions_remaining !== null
                          ? t('sessions_remaining', { count: up.sessions_remaining })
                          : 'Ilimitado'}
                        {' · '}
                        {t('expires', { date: format(parseISO(up.expires_at), 'dd/MM/yyyy') })}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('session_deducted')}</p>
              </div>
            ) : (
              <div className="mb-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {locale === 'es'
                    ? 'No tienes una membresía activa para esta clase.'
                    : "You don't have an active membership for this class."}
                </p>
                <Button
                  onClick={handleBuySingle}
                  disabled={singleLoading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {singleLoading
                    ? (locale === 'es' ? 'Redirigiendo...' : 'Redirecting...')
                    : locale === 'es'
                      ? `Pagar clase individual — $${SINGLE_SESSION_PRICES_MXN[session.class_type]} MXN`
                      : `Pay single class — $${SINGLE_SESSION_PRICES_MXN[session.class_type]} MXN`
                  }
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {locale === 'es' ? '¿Quieres clases ilimitadas? ' : 'Want unlimited classes? '}
                  <Link href={`/${locale}/packages`} className="font-medium text-primary underline">
                    {locale === 'es' ? 'Ver membresías' : 'View memberships'}
                  </Link>
                </p>
              </div>
            )}
          </>
        )}

        {/* Guest form */}
        {!userId && (
          <div className="mb-6 space-y-3">
            <p className="text-sm text-muted-foreground">{t('book_as_guest')}</p>
            <input
              type="text"
              placeholder={useTranslations('auth')('full_name')}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="email"
              placeholder={useTranslations('auth')('email')}
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-xs text-muted-foreground">
                Para comprar una membresía,{' '}
                <Link href={`/${locale}/login`} className="text-primary font-medium underline">
                  inicia sesión
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {locale === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          {(!userId || compatiblePackages.length > 0) && (
            <Button
              onClick={handleBook}
              disabled={loading || (userId ? !selectedPackage : !guestName || !guestEmail)}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (locale === 'es' ? 'Reservando...' : 'Booking...') : t('book')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
