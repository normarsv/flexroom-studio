'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { format, parseISO } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faCircleExclamation, faTag, faChevronDown } from '@fortawesome/free-solid-svg-icons'
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
  creditSessions: number
  onClose: () => void
}

export default function BookingModal({ session, locale, userId, userPackages, creditSessions, onClose }: Props) {
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
  const [useCredit, setUseCredit] = useState(false)

  // Coupon state for single-class payment
  const [showCoupon, setShowCoupon] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string
    code: string
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    description: string | null
  } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError(null)
    setAppliedCoupon(null)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput.trim(),
          context: 'classes',
          userId,
          classType: session.class_type,
        }),
      })
      const data = await res.json()
      if (data.valid) {
        setAppliedCoupon(data.coupon)
        toast.success('¡Cupón aplicado!')
      } else {
        setCouponError(data.error || 'Cupón no válido')
      }
    } catch {
      setCouponError('Error al validar el cupón')
    } finally {
      setCouponLoading(false)
    }
  }

  function computeSinglePrice(): number {
    const base = SINGLE_SESSION_PRICES_MXN[session.class_type]
    if (!appliedCoupon) return base
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.round(base * (1 - appliedCoupon.discount_value / 100))
    }
    return Math.max(0, base - appliedCoupon.discount_value)
  }

  async function handleBuySingle() {
    setSingleLoading(true)
    try {
      const res = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classSessionId: session.id,
          locale,
          couponCode: appliedCoupon?.code,
        }),
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
          userPackageId: useCredit ? null : (userId ? selectedPackage : null),
          useCredit: useCredit || undefined,
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
            {creditSessions > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => { setUseCredit(!useCredit); setSelectedPackage(null) }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    useCredit
                      ? 'border-[#F4EF71] bg-[#F4EF71]/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="text-sm font-medium text-primary">
                    {locale === 'es' ? `Usar crédito (${creditSessions} disponible${creditSessions > 1 ? 's' : ''})` : `Use credit (${creditSessions} available)`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {locale === 'es' ? 'Crédito de cancelación' : 'Cancellation credit'}
                  </p>
                </button>
              </div>
            )}

            {!useCredit && compatiblePackages.length > 0 ? (
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
                      ? `Pagar clase individual — $${computeSinglePrice()} MXN${appliedCoupon && computeSinglePrice() !== SINGLE_SESSION_PRICES_MXN[session.class_type] ? ` (antes $${SINGLE_SESSION_PRICES_MXN[session.class_type]})` : ''}`
                      : `Pay single class — $${computeSinglePrice()} MXN${appliedCoupon && computeSinglePrice() !== SINGLE_SESSION_PRICES_MXN[session.class_type] ? ` (was $${SINGLE_SESSION_PRICES_MXN[session.class_type]})` : ''}`
                  }
                </Button>

                {/* Coupon input */}
                <div>
                  <button
                    onClick={() => setShowCoupon((v) => !v)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
                  >
                    <FontAwesomeIcon icon={faTag} className="w-3 h-3" />
                    {locale === 'es' ? '¿Tienes un cupón?' : 'Have a coupon?'}
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`w-3 h-3 transition-transform ${showCoupon ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showCoupon && (
                    <div className="mt-2 space-y-2">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-[#F4EF71]/20 border border-[#F4EF71] rounded-lg px-3 py-2">
                          <div>
                            <p className="text-xs font-bold text-foreground">{appliedCoupon.code}</p>
                            <p className="text-xs text-muted-foreground">
                              {appliedCoupon.discount_type === 'percentage'
                                ? `${appliedCoupon.discount_value}% de descuento`
                                : `$${appliedCoupon.discount_value} MXN de descuento`}
                            </p>
                          </div>
                          <button
                            onClick={() => { setAppliedCoupon(null); setCouponInput('') }}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            Quitar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                            placeholder="CÓDIGO"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-border text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          />
                          <Button
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponInput.trim()}
                            variant="outline"
                            className="text-sm shrink-0"
                          >
                            {couponLoading ? '...' : 'Aplicar'}
                          </Button>
                        </div>
                      )}
                      {couponError && (
                        <p className="text-xs text-destructive">{couponError}</p>
                      )}
                    </div>
                  )}
                </div>

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
          {(!userId || useCredit || compatiblePackages.length > 0) && (
            <Button
              onClick={handleBook}
              disabled={loading || (userId ? (!useCredit && !selectedPackage) : !guestName || !guestEmail)}
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
