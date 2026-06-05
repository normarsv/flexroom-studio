'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClassSession, Instructor, RecurringTemplate } from '@/types'
import { CLASS_TYPE_LABELS, CLASS_TYPE_COLORS, DAYS_OF_WEEK } from '@/lib/constants'
import { toast } from 'sonner'
import SessionFormModal from './SessionFormModal'

interface Props {
  sessions: ClassSession[]
  instructors: Instructor[]
  templates: RecurringTemplate[]
  locale: string
}

export default function AdminSchedule({ sessions: initial, instructors, templates: initialTemplates, locale }: Props) {
  const [sessions, setSessions] = useState(initial)
  const [templates, setTemplates] = useState(initialTemplates)
  const [tab, setTab] = useState<'upcoming' | 'recurring'>('upcoming')
  const [editingSession, setEditingSession] = useState<ClassSession | null | 'new'>(null)
  const [generatingWeeks, setGeneratingWeeks] = useState(false)

  const sessionsByDate = sessions.reduce<Record<string, ClassSession[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  async function handleCancel(session: ClassSession) {
    if (!confirm('¿Cancelar esta clase?')) return
    const res = await fetch(`/api/admin/sessions/${session.id}/cancel`, { method: 'POST' })
    if (res.ok) {
      setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, status: 'cancelled' } : s))
      toast.success('Clase cancelada')
    } else {
      toast.error('Error al cancelar')
    }
  }

  async function generateFromTemplates() {
    setGeneratingWeeks(true)
    const res = await fetch('/api/admin/sessions/generate', { method: 'POST' })
    if (res.ok) {
      toast.success('Clases generadas exitosamente')
      window.location.reload()
    } else {
      toast.error('Error al generar clases')
    }
    setGeneratingWeeks(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Horario</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateFromTemplates} disabled={generatingWeeks}>
            <RotateCcw className="w-4 h-4 mr-1" />
            {generatingWeeks ? 'Generando...' : 'Generar desde plantillas'}
          </Button>
          <Button size="sm" onClick={() => setEditingSession('new')} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" />
            Nueva clase
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6 w-fit">
        {(['upcoming', 'recurring'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            {t === 'upcoming' ? 'Próximas clases' : 'Plantillas semanales'}
          </button>
        ))}
      </div>

      {tab === 'upcoming' && (
        <div className="space-y-6">
          {Object.keys(sessionsByDate).sort().map((dateStr) => (
            <div key={dateStr}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 capitalize">
                {format(parseISO(dateStr), "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                {sessionsByDate[dateStr].map((session, idx) => {
                  const label = CLASS_TYPE_LABELS[session.class_type]
                  const color = CLASS_TYPE_COLORS[session.class_type]
                  return (
                    <div key={session.id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
                        {label.es}
                      </span>
                      <span className="text-sm font-medium text-primary">{session.start_time.slice(0, 5)}</span>
                      <span className="text-sm text-muted-foreground">
                        {(session as any).instructor?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {session.capacity - session.spots_booked} / {session.capacity} lugares
                      </span>
                      {session.status === 'cancelled' && (
                        <Badge variant="destructive" className="text-xs">Cancelada</Badge>
                      )}
                      <div className="ml-auto flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditingSession(session)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {session.status !== 'cancelled' && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(session)} className="text-destructive hover:text-destructive">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'recurring' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Define el horario semanal recurrente. Usa "Generar desde plantillas" para crear las sesiones de las próximas 2 semanas.
          </p>
          {DAYS_OF_WEEK.map((day) => {
            const dayTemplates = templates.filter((t) => t.day_of_week === day.value)
            return (
              <div key={day.value}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{day.es}</h3>
                {dayTemplates.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic ml-2">Sin clases</p>
                ) : (
                  <div className="bg-white rounded-xl border border-border overflow-hidden">
                    {dayTemplates.map((t, idx) => {
                      const label = CLASS_TYPE_LABELS[t.class_type]
                      const color = CLASS_TYPE_COLORS[t.class_type]
                      return (
                        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>{label.es}</span>
                          <span className="text-sm font-medium text-primary">{t.start_time.slice(0, 5)}</span>
                          <span className="text-sm text-muted-foreground">{(t as any).instructor?.name}</span>
                          <span className="text-xs text-muted-foreground">Cap: {t.capacity}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editingSession !== null && (
        <SessionFormModal
          session={editingSession === 'new' ? null : editingSession}
          instructors={instructors}
          locale={locale}
          onClose={() => setEditingSession(null)}
          onSaved={() => { setEditingSession(null); window.location.reload() }}
        />
      )}
    </div>
  )
}
