'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { format, parseISO, isSameDay } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { Clock, Users, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

  // Group sessions by date
  const sessionsByDate = sessions.reduce<Record<string, ClassSession[]>>((acc, session) => {
    const key = session.date
    if (!acc[key]) acc[key] = []
    acc[key].push(session)
    return acc
  }, {})

  const dates = Object.keys(sessionsByDate).sort()

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Request class banner */}
      <div className="bg-secondary rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-primary text-sm">{t('request_title')}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{t('request_subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowRequest(true)} className="shrink-0">
          {t('request_class')}
        </Button>
      </div>

      {/* Schedule by day */}
      <div className="space-y-8">
        {dates.map((dateStr) => {
          const date = parseISO(dateStr)
          const daySessions = sessionsByDate[dateStr]

          return (
            <div key={dateStr}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-center min-w-[52px]">
                  <div className="text-xs font-medium uppercase opacity-80">
                    {format(date, 'EEE', { locale: dateLocale })}
                  </div>
                  <div className="text-xl font-bold leading-none">
                    {format(date, 'd')}
                  </div>
                </div>
                <span className="text-muted-foreground text-sm capitalize">
                  {format(date, 'MMMM yyyy', { locale: dateLocale })}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Sessions */}
              <div className="space-y-2">
                {daySessions.map((session) => {
                  const spotsLeft = session.capacity - session.spots_booked
                  const isFull = spotsLeft <= 0
                  const classLabel = CLASS_TYPE_LABELS[session.class_type]
                  const colorClass = CLASS_TYPE_COLORS[session.class_type]

                  return (
                    <div
                      key={session.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${isFull ? 'opacity-60' : ''}`}
                    >
                      {/* Time */}
                      <div className="text-center min-w-[56px]">
                        <p className="text-sm font-bold text-primary">
                          {session.start_time.slice(0, 5)}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {session.duration_minutes}m
                        </p>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
                            {locale === 'es' ? classLabel.es : classLabel.en}
                          </span>
                          {session.instructor && (
                            <span className="text-sm text-muted-foreground">
                              {session.instructor.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className={`text-xs ${spotsLeft <= 2 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                            {isFull
                              ? t('full')
                              : t('spots_left', { count: spotsLeft })}
                          </span>
                        </div>
                      </div>

                      {/* Book button */}
                      <Button
                        size="sm"
                        disabled={isFull}
                        onClick={() => setSelectedSession(session)}
                        className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                      >
                        {t('book')}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {dates.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t('no_classes')}</p>
        )}
      </div>

      {/* Booking modal */}
      {selectedSession && (
        <BookingModal
          session={selectedSession}
          locale={locale}
          userId={userId}
          userPackages={userPackages}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {/* Request class modal */}
      {showRequest && (
        <RequestClassModal
          locale={locale}
          onClose={() => setShowRequest(false)}
        />
      )}
    </div>
  )
}
