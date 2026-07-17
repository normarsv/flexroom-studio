'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { format, parseISO, isFuture } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faBox, faCircleExclamation, faTriangleExclamation, faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Booking, UserPackage } from '@/types'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'

interface Props {
  bookings: (Booking & { session?: any })[]
  userPackages: UserPackage[]
  profile: { full_name: string | null; email: string; avatar_url: string | null } | null
  creditSessions: number
  cancellationHoursLimit: number
  locale: string
}

export default function AccountDashboard({ bookings, userPackages, profile, creditSessions, cancellationHoursLimit, locale }: Props) {
  const t = useTranslations('account')
  const tCommon = useTranslations('common')
  const dateLocale = locale === 'es' ? es : enUS
  const [tab, setTab] = useState<'bookings' | 'packages'>('bookings')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmBooking, setConfirmBooking] = useState<{ id: string; willLose: boolean } | null>(null)

  const upcomingBookings = bookings.filter(
    (b) => b.session && isFuture(parseISO(`${b.session.date}T${b.session.start_time}`))
  )
  const pastBookings = bookings.filter(
    (b) => !b.session || !isFuture(parseISO(`${b.session.date}T${b.session.start_time}`))
  )

  const activePackages = userPackages.filter((up) => isFuture(parseISO(up.expires_at)))
  const expiredPackages = userPackages.filter((up) => !isFuture(parseISO(up.expires_at)))

  function handleCancelClick(bookingId: string, sessionDate: string, sessionTime: string) {
    const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`)
    const hoursUntilClass = (sessionDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
    const willLose = hoursUntilClass < cancellationHoursLimit
    setConfirmBooking({ id: bookingId, willLose })
  }

  async function handleConfirmCancel() {
    if (!confirmBooking) return
    setCancellingId(confirmBooking.id)
    setConfirmBooking(null)
    try {
      const res = await fetch(`/api/bookings/${confirmBooking.id}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (data.creditGranted) {
          toast.success(locale === 'es'
            ? '¡Reserva cancelada! Se añadió 1 crédito a tu cuenta.'
            : 'Booking cancelled! 1 credit added to your account.')
        } else {
          toast.success(locale === 'es' ? 'Reserva cancelada.' : 'Booking cancelled.')
        }
        window.location.reload()
      } else {
        toast.error(data.error || 'Error al cancelar')
      }
    } finally {
      setCancellingId(null)
    }
  }

  const BookingRow = ({ booking }: { booking: any }) => {
    const session = booking.session
    if (!session) return null
    const sessionDate = parseISO(`${session.date}T${session.start_time}`)
    const upcoming = isFuture(sessionDate)
    const classLabel = CLASS_TYPE_LABELS[session.class_type as keyof typeof CLASS_TYPE_LABELS]

    return (
      <div className="flex items-center justify-between p-4 border-b border-border last:border-0">
        <div>
          <p className="font-medium text-primary text-sm">
            {locale === 'es' ? classLabel?.es : classLabel?.en}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(sessionDate, "EEEE d 'de' MMMM, HH:mm", { locale: dateLocale })}
            {session.instructor && ` · ${session.instructor.name}`}
          </p>
        </div>
        {upcoming && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCancelClick(booking.id, session.date, session.start_time)}
            disabled={cancellingId === booking.id}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
          >
            {cancellingId === booking.id ? '...' : t('cancel_booking')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Profile */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
        {profile && (
          <p className="text-muted-foreground text-sm mt-1">
            {profile.full_name || profile.email}
          </p>
        )}
      </div>

      {/* Credits */}
      {creditSessions > 0 && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-[#F4EF71]/30 border border-[#F4EF71] rounded-xl">
          <span className="text-2xl font-black text-[#1E1E1E]">{creditSessions}</span>
          <div>
            <p className="font-semibold text-sm text-[#1E1E1E]">
              {locale === 'es' ? 'Crédito(s) disponible(s)' : 'Credit(s) available'}
            </p>
            <p className="text-xs text-[#1E1E1E]/70">
              {locale === 'es'
                ? 'Úsalos al reservar tu próxima clase.'
                : 'Use them when booking your next class.'}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6">
        <button
          onClick={() => setTab('bookings')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'bookings' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <FontAwesomeIcon icon={faCalendarDays} className="w-4 h-4" />
          {t('my_bookings')}
        </button>
        <button
          onClick={() => setTab('packages')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'packages' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <FontAwesomeIcon icon={faBox} className="w-4 h-4" />
          {t('my_packages')}
        </button>
      </div>

      {/* Bookings tab */}
      {tab === 'bookings' && (
        <div>
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-primary text-sm">{t('upcoming')}</h2>
            </div>
            {upcomingBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm p-4">{t('no_bookings')}</p>
            ) : (
              upcomingBookings.map((b) => <BookingRow key={b.id} booking={b} />)
            )}
          </div>

          {pastBookings.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="font-semibold text-primary text-sm">{t('past')}</h2>
              </div>
              {pastBookings.map((b) => <BookingRow key={b.id} booking={b} />)}
            </div>
          )}
        </div>
      )}

      {/* Packages tab */}
      {tab === 'packages' && (
        <div className="space-y-3">
          {activePackages.length === 0 && expiredPackages.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('no_packages')}</p>
          ) : (
            <>
              {activePackages.map((up) => (
                <div key={up.id} className="bg-white rounded-xl border border-primary/30 p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-primary text-sm">
                        {locale === 'es' ? up.package?.name_es : up.package?.name_en}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {up.sessions_remaining !== null
                          ? t('sessions_remaining', { count: up.sessions_remaining })
                          : 'Ilimitado'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('expires', { date: format(parseISO(up.expires_at), 'dd MMM yyyy', { locale: dateLocale }) })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Activo</Badge>
                  </div>
                </div>
              ))}
              {expiredPackages.map((up) => (
                <div key={up.id} className="bg-white rounded-xl border border-border p-4 shadow-sm opacity-60">
                  <p className="font-semibold text-primary text-sm">
                    {locale === 'es' ? up.package?.name_es : up.package?.name_en}
                  </p>
                  <Badge variant="secondary" className="text-xs mt-1">Vencida</Badge>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      {/* ── CANCEL CONFIRMATION MODAL ─────────────────────── */}
      {confirmBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            {confirmBooking.willLose ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-red-500" />
                  </div>
                  <h2 className="font-bold text-primary text-lg">
                    {locale === 'es' ? 'Cancelación tardía' : 'Late cancellation'}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {locale === 'es'
                    ? `Estás cancelando con menos de ${cancellationHoursLimit} horas de anticipación.`
                    : `You're cancelling with less than ${cancellationHoursLimit} hours notice.`}
                </p>
                <p className="text-sm font-medium text-red-600 mb-6">
                  {locale === 'es'
                    ? 'Perderás esta clase y el pago. No se generará ningún crédito.'
                    : 'You will lose this class and your payment. No credit will be issued.'}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#F4EF71]/40 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faCircleCheck} className="w-5 h-5 text-[#1E1E1E]" />
                  </div>
                  <h2 className="font-bold text-primary text-lg">
                    {locale === 'es' ? 'Cancelar reserva' : 'Cancel booking'}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {locale === 'es'
                    ? `Estás cancelando con más de ${cancellationHoursLimit} horas de anticipación.`
                    : `You're cancelling with more than ${cancellationHoursLimit} hours notice.`}
                </p>
                <p className="text-sm font-medium text-[#1E1E1E] mb-6">
                  {locale === 'es'
                    ? 'Recibirás 1 crédito para reservar otra clase en el futuro.'
                    : "You'll receive 1 credit to book another class in the future."}
                </p>
              </>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmBooking(null)}
                className="flex-1"
              >
                {locale === 'es' ? 'Volver' : 'Go back'}
              </Button>
              <Button
                onClick={handleConfirmCancel}
                className={`flex-1 ${confirmBooking.willLose ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
              >
                {locale === 'es' ? 'Sí, cancelar' : 'Yes, cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
