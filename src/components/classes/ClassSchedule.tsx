'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { format, parseISO } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faUsers, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { ClassSession, UserPackage } from '@/types'
import { CLASS_TYPE_LABELS, CLASS_TYPE_COLORS } from '@/lib/constants'
import BookingModal from './BookingModal'
import RequestClassModal from './RequestClassModal'

interface Props {
  sessions: ClassSession[]
  locale: string
  userId: string | null
  userPackages: UserPackage[]
}

export default function ClassSchedule({ sessions, locale, userId, userPackages }: Props) {
  const t = useTranslations('classes')
  const dateLocale = locale === 'es' ? es : enUS
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)
  const [showRequest, setShowRequest] = useState(false)
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

  const daySessions = sessionsByDate[selectedDate] ?? []

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

          return (
            <div
              key={session.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border bg-card
                transition-all duration-200 hover:shadow-md hover:-translate-y-px
                ${isFull ? 'opacity-50' : 'border-border'}`}
            >
              {/* Time block */}
              <div className="text-center min-w-[56px] shrink-0">
                <p className="font-heading font-bold text-base text-foreground leading-none">
                  {session.start_time.slice(0, 5)}
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
                <div className="flex items-center gap-1 mt-1.5">
                  <FontAwesomeIcon icon={faUsers} className="w-3 h-3 text-muted-foreground" />
                  <span className={`text-xs ${
                    isFull
                      ? 'text-muted-foreground'
                      : spotsLeft <= 2
                        ? 'text-amber-600 font-medium'
                        : 'text-muted-foreground'
                  }`}>
                    {isFull ? t('full') : t('spots_left', { count: spotsLeft })}
                  </span>
                </div>
              </div>

              {/* Book button */}
              <Button
                size="sm"
                disabled={isFull}
                onClick={() => setSelectedSession(session)}
                className="shrink-0 rounded-xl bg-[#1E1E1E] text-white hover:bg-[#1E1E1E]/80 disabled:opacity-30 gap-1.5"
              >
                {t('book')}
                <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5" />
              </Button>
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
