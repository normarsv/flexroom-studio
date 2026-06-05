'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { format, parseISO } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClassSession, UserPackage } from '@/types'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
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

  const canBookAsUser = userId && compatiblePackages.length > 0
  const canBookAsSingleSession = !userId // guests only book individual sessions

  async function handleBook() {
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          userPackageId: selectedPackage,
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
          <X className="w-5 h-5" />
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
              <div className="mb-6 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800">{t('no_active_package')}</p>
                  <Link href={`/${locale}/packages`} className="text-sm font-medium text-primary underline">
                    {t('buy_package')}
                  </Link>
                </div>
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
            Cancelar
          </Button>
          <Button
            onClick={handleBook}
            disabled={
              loading ||
              (userId ? !selectedPackage : !guestName || !guestEmail)
            }
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? 'Reservando...' : t('book')}
          </Button>
        </div>
      </div>
    </div>
  )
}
