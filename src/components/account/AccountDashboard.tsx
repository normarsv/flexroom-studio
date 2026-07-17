'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { format, parseISO, isFuture } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faBox, faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
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
  locale: string
}

export default function AccountDashboard({ bookings, userPackages, profile, creditSessions, locale }: Props) {
  const t = useTranslations('account')
  const tCommon = useTranslations('common')
  const dateLocale = locale === 'es' ? es : enUS
  const [tab, setTab] = useState<'bookings' | 'packages'>('bookings')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const upcomingBookings = bookings.filter(
    (b) => b.session && isFuture(parseISO(`${b.session.date}T${b.session.start_time}`))
  )
  const pastBookings = bookings.filter(
    (b) => !b.session || !isFuture(parseISO(`${b.session.date}T${b.session.start_time}`))
  )

  const activePackages = userPackages.filter((up) => isFuture(parseISO(up.expires_at)))
  const expiredPackages = userPackages.filter((up) => !isFuture(parseISO(up.expires_at)))

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (data.creditGranted) {
          toast.success(locale === 'es'
            ? '¡Reserva cancelada! Se añadió un crédito a tu cuenta para usarlo en otra clase.'
            : 'Booking cancelled! A credit was added to your account for another class.')
        } else {
          toast.success(locale === 'es'
            ? 'Reserva cancelada. La cancelación fue dentro del período límite, no se generó crédito.'
            : `Booking cancelled. Cancellation was within the ${data.cancellationHoursLimit}h limit — no credit issued.`)
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
            onClick={() => handleCancel(booking.id)}
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
    </div>
  )
}
