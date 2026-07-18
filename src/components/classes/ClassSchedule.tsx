'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { format, parseISO } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faUsers, faChevronRight, faCircleCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { ClassSession, ClassType, UserPackage } from '@/types'
import { CLASS_TYPE_LABELS, CLASS_TYPE_COLORS } from '@/lib/constants'
import BookingModal from './BookingModal'
import RequestClassModal from './RequestClassModal'

interface Props {
  sessions: ClassSession[]
  locale: string
  userId: string | null
  userPackages: UserPackage[]
  bookedSessionIds: string[]
  bookingSuccess: boolean
  creditSessions: number
}

export default function ClassSchedule({ sessions, locale, userId, userPackages, bookedSessionIds, bookingSuccess, creditSessions }: Props) {
  const t = useTranslations('classes')
  const dateLocale = locale === 'es' ? es : enUS
  const router = useRouter()
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)
  const [showRequest, setShowRequest] = useState(false)
  const [filterType, setFilterType] = useState<ClassType | 'all'>('all')
  const [showSuccess, setShowSuccess] = useState(bookingSuccess)
  const stripRef = useRef<HTMLDivElement>(null)

  // Group sessions by date
  const sessionsByDate = sessions.reduce<Record<string, ClassSession[]>>((acc, session) => {
    const key = session.date
    if (!acc[key]) acc[key] = []
    acc[key].push(session)
    return acc
  }, {})

  const dates = Object.keys(sessionsByDate).sort()
  const todayStr = new Date().toISOString().split('T')[0]

  // Default to today if it has sessions, otherwise the first available date
  const defaultDate = dates.includes(todayStr) ? todayStr : (dates[0] ?? '')
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate)

  // Scroll the active pill into view whenever selectedDate changes
  useEffect(() => {
    const active = stripRef.current?.querySelector<HTMLButtonElement>('[data-active="true"]')
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedDate])

  const allDaySessions = sessionsByDate[selectedDate] ?? []
  const daySessions = filterType === 'all'
    ? allDaySessions
    : allDaySessions.filter((s) => s.class_type === filterType)

  // Formatted heading for the selected date
  const selectedDateObj = selectedDate ? parseISO(selectedDate) : null
  const dayHeading = selectedDateObj
    ? format(selectedDateObj, 'PPPP', { locale: dateLocale })
    : ''
  const dayHeadingDisplay = dayHeading.charAt(0).toUpperCase() + dayHeading.slice(1)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading font-extrabold text-3xl text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* ── BOOKING SUCCESS BANNER ────────────────────────── */}
      {showSuccess && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-[#F4EF71]/30 border border-[#F4EF71] rounded-2xl">
          <FontAwesomeIcon icon={faCircleCheck} className="w-5 h-5 text-[#1E1E1E] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-[#1E1E1E] text-sm">
              {locale === 'es' ? '¡Reserva confirmada!' : 'Booking confirmed!'}
            </p>
            <p className="text-xs text-[#1E1E1E]/70 mt-0.5">
              {locale === 'es'
                ? 'Tu clase ha sido reservada exitosamente. '
                : 'Your class has been successfully booked. '}
              <button
                onClick={() => router.push(`/${locale}/account`)}
                className="font-medium underline"
              >
                {locale === 'es' ? 'Ver mis clases' : 'View my bookings'}
              </button>
            </p>
          </div>
          <button onClick={() => { setShowSuccess(false); router.replace(`/${locale}/classes`) }} className="text-[#1E1E1E]/50 hover:text-[#1E1E1E]">
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── DATE PICKER STRIP ─────────────────────────────── */}
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 mb-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dates.map((dateStr) => {
          const date = parseISO(dateStr)
          const isActive = selectedDate === dateStr
          const isToday = dateStr === todayStr

          return (
            <button
              key={dateStr}
              data-active={isActive}
              onClick={() => setSelectedDate(dateStr)}
              className={`shrink-0 flex flex-col items-center gap-0.5 px-3.5 py-2.5 rounded-2xl border
                transition-all duration-200 min-w-[58px]
                ${isActive
                  ? 'bg-[#1E1E1E] border-[#1E1E1E] text-white shadow-md scale-[1.04]'
                  : 'bg-card border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
            >
              {/* Day label — "hoy" / "today" for current day, otherwise abbrev */}
              <span className={`text-[0.6rem] font-semibold uppercase tracking-wide leading-none
                ${isActive ? 'text-white/60' : 'text-muted-foreground'}`}>
                {isToday
                  ? (locale === 'es' ? 'hoy' : 'today')
                  : format(date, 'EEE', { locale: dateLocale })}
              </span>

              {/* Day number */}
              <span className={`font-heading font-black text-xl leading-none
                ${isActive ? 'text-white' : 'text-foreground'}`}>
                {format(date, 'd')}
              </span>

              {/* Yellow dot when active, subtle dot otherwise */}
              <span className={`w-1 h-1 rounded-full mt-0.5 transition-colors duration-200
                ${isActive ? 'bg-[#F4EF71]' : 'bg-transparent'}`}
              />
            </button>
          )
        })}
      </div>

      {/* ── CLASS TYPE FILTER ─────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button
          onClick={() => setFilterType('all')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all
            ${filterType === 'all'
              ? 'bg-[#1E1E1E] border-[#1E1E1E] text-white'
              : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
        >
          {locale === 'es' ? 'Todas' : 'All'}
        </button>
        {(Object.keys(CLASS_TYPE_LABELS) as ClassType[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all
              ${filterType === type
                ? 'bg-[#1E1E1E] border-[#1E1E1E] text-white'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
          >
            {locale === 'es' ? CLASS_TYPE_LABELS[type].es : CLASS_TYPE_LABELS[type].en}
          </button>
        ))}
      </div>

      {/* ── DAY HEADING + SESSION COUNT ───────────────────── */}
      {selectedDate && (
        <div className="flex items-baseline justify-between mb-4 border-b border-border pb-3">
          <p className="font-heading font-extrabold text-lg text-foreground capitalize">
            {dayHeadingDisplay}
          </p>
          <span className="text-xs text-muted-foreground tabular-nums">
            {daySessions.length}&nbsp;
            {daySessions.length === 1
              ? (locale === 'es' ? 'clase' : 'class')
              : (locale === 'es' ? 'clases' : 'classes')}
          </span>
        </div>
      )}

      {/* ── SESSION CARDS ─────────────────────────────────── */}
      <div className="space-y-2 mb-10">
        {daySessions.length === 0 && (
          <p className="text-center text-muted-foreground py-16">{t('no_classes')}</p>
        )}

        {daySessions.map((session) => {
          const spotsLeft = session.capacity - session.spots_booked
          const isFull = spotsLeft <= 0
          const classLabel = CLASS_TYPE_LABELS[session.class_type]
          const colorClass = CLASS_TYPE_COLORS[session.class_type]
          const sessionDateTime = new Date(`${session.date}T${session.start_time}`)
          const isPast = sessionDateTime < new Date()
          const isBooked = bookedSessionIds.includes(session.id)

          return (
            <div
              key={session.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border bg-card
                transition-all duration-200 hover:shadow-md hover:-translate-y-px
                ${isFull || isPast ? 'opacity-50' : 'border-border'}`}
            >
              {/* Time block */}
              <div className="text-center min-w-[56px] shrink-0">
                <p className="font-heading font-bold text-base text-foreground leading-none">
                  {(() => {
                    const [h, m] = session.start_time.split(':').map(Number)
                    const ampm = h >= 12 ? 'pm' : 'am'
                    const h12 = h % 12 || 12
                    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
                  })()}
                </p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5 mt-1">
                  <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5" />
                  {session.duration_minutes}m
                </p>
              </div>

              {/* Divider */}
              <div className="w-px h-10 bg-border shrink-0" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${colorClass}`}>
                    {locale === 'es' ? classLabel.es : classLabel.en}
                  </span>
                  {session.instructor && (
                    <span className="text-sm text-muted-foreground">
                      {session.instructor.name}
                    </span>
                  )}
                </div>
                {(isFull || spotsLeft <= 3) && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <FontAwesomeIcon icon={faUsers} className="w-3 h-3 text-muted-foreground" />
                    <span className={`text-xs font-medium ${isFull ? 'text-muted-foreground' : 'text-amber-600'}`}>
                      {isFull ? t('full') : locale === 'es' ? `¡Solo ${spotsLeft} lugar${spotsLeft === 1 ? '' : 'es'} disponible${spotsLeft === 1 ? '' : 's'}!` : `Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left!`}
                    </span>
                  </div>
                )}
              </div>

              {/* Book button */}
              {isBooked ? (
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4EF71]/40 border border-[#F4EF71]">
                  <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5 text-[#1E1E1E]" />
                  <span className="text-xs font-semibold text-[#1E1E1E]">
                    {locale === 'es' ? 'Reservada' : 'Booked'}
                  </span>
                </div>
              ) : (
                <Button
                  size="sm"
                  disabled={isFull || isPast}
                  onClick={() => !isPast && setSelectedSession(session)}
                  className="shrink-0 rounded-xl bg-[#1E1E1E] text-white hover:bg-[#1E1E1E]/80 disabled:opacity-30 gap-1.5"
                >
                  {isPast
                    ? (locale === 'es' ? 'Terminada' : 'Ended')
                    : <>{t('book')}<FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5" /></>
                  }
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── REQUEST CLASS BANNER ──────────────────────────── */}
      <div className="bg-secondary rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground text-sm">{t('request_title')}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{t('request_subtitle')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRequest(true)}
          className="shrink-0 rounded-xl"
        >
          {t('request_class')}
        </Button>
      </div>

      {/* Modals */}
      {selectedSession && (
        <BookingModal
          session={selectedSession}
          locale={locale}
          userId={userId}
          userPackages={userPackages}
          creditSessions={creditSessions}
          onClose={() => setSelectedSession(null)}
        />
      )}
      {showRequest && (
        <RequestClassModal
          locale={locale}
          onClose={() => setShowRequest(false)}
        />
      )}
    </div>
  )
}
