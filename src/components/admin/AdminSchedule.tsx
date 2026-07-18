'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faPencil, faXmark, faRotateLeft, faEnvelope, faCheck, faTrash, faCalendarPlus } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClassSession, ClassType, Instructor, RecurringTemplate } from '@/types'
import { CLASS_TYPE_LABELS, CLASS_TYPE_COLORS, DAYS_OF_WEEK } from '@/lib/constants'
import { toast } from 'sonner'
import SessionFormModal from './SessionFormModal'

interface Props {
  sessions: ClassSession[]
  instructors: Instructor[]
  templates: RecurringTemplate[]
  requests: any[]
  locale: string
}

export default function AdminSchedule({ sessions: initial, instructors, templates: initialTemplates, requests, locale }: Props) {
  const [sessions, setSessions] = useState(initial)
  const [templates, setTemplates] = useState(initialTemplates)
  const [requestList, setRequestList] = useState(requests)
  const [tab, setTab] = useState<'upcoming' | 'recurring' | 'requests'>('upcoming')
  const [editingSession, setEditingSession] = useState<ClassSession | null | 'new'>(null)
  const [generatingWeeks, setGeneratingWeeks] = useState(false)
  const [templateModal, setTemplateModal] = useState<RecurringTemplate | null | 'new'>(null)
  const [templateForm, setTemplateForm] = useState({ day_of_week: 1, start_time: '08:00', duration_minutes: 50, class_type: 'funcional' as ClassType, instructor_id: '', capacity: 5 })
  const [savingTemplate, setSavingTemplate] = useState(false)

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

  async function handleAcknowledge(id: string) {
    const res = await fetch(`/api/admin/class-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledged: true }),
    })
    if (res.ok) {
      setRequestList((prev) => prev.map((r) => r.id === id ? { ...r, acknowledged: true } : r))
      toast.success('Solicitud marcada como vista')
    } else {
      toast.error('Error al actualizar')
    }
  }

  async function handleDeleteRequest(id: string) {
    const res = await fetch(`/api/admin/class-requests/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRequestList((prev) => prev.filter((r) => r.id !== id))
      toast.success('Solicitud eliminada')
    } else {
      toast.error('Error al eliminar')
    }
  }

  function openNewTemplate(dayOfWeek?: number) {
    setTemplateForm({ day_of_week: dayOfWeek ?? 1, start_time: '08:00', duration_minutes: 50, class_type: 'funcional', instructor_id: instructors[0]?.id || '', capacity: 5 })
    setTemplateModal('new')
  }

  function openEditTemplate(t: RecurringTemplate) {
    setTemplateForm({ day_of_week: t.day_of_week, start_time: t.start_time.slice(0, 5), duration_minutes: t.duration_minutes, class_type: t.class_type, instructor_id: t.instructor_id, capacity: t.capacity })
    setTemplateModal(t)
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true)
    const isNew = templateModal === 'new'
    const url = isNew ? '/api/admin/templates' : `/api/admin/templates/${(templateModal as RecurringTemplate).id}`
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateForm),
    })
    const data = await res.json()
    if (res.ok) {
      if (isNew) {
        setTemplates((prev) => [...prev, data].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)))
      } else {
        setTemplates((prev) => prev.map((t) => t.id === data.id ? data : t))
      }
      toast.success(isNew ? 'Plantilla creada' : 'Plantilla actualizada')
      setTemplateModal(null)
    } else {
      toast.error(data.error || 'Error al guardar')
    }
    setSavingTemplate(false)
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm('¿Eliminar esta plantilla?')) return
    const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success('Plantilla eliminada')
    } else {
      toast.error('Error al eliminar')
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
            <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4 mr-1" />
            {generatingWeeks ? 'Generando...' : 'Generar desde plantillas'}
          </Button>
          <Button size="sm" onClick={() => setEditingSession('new')} className="bg-primary text-primary-foreground">
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-1" />
            Nueva clase
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6 w-fit">
        {([
            { key: 'upcoming', label: 'Próximas clases' },
            { key: 'recurring', label: 'Plantillas semanales' },
            { key: 'requests', label: `Solicitudes${requestList.filter(r => !r.acknowledged).length > 0 ? ` (${requestList.filter(r => !r.acknowledged).length})` : ''}` },
          ] as { key: typeof tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            {label}
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
                          <FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5" />
                        </Button>
                        {session.status !== 'cancelled' && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(session)} className="text-destructive hover:text-destructive">
                            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Define el horario semanal recurrente. Usa "Generar desde plantillas" para crear las sesiones de las próximas 2 semanas.
            </p>
            <Button size="sm" onClick={() => openNewTemplate()} className="bg-primary text-primary-foreground shrink-0 ml-4">
              <FontAwesomeIcon icon={faCalendarPlus} className="w-3.5 h-3.5 mr-1.5" />
              Nueva plantilla
            </Button>
          </div>

          {DAYS_OF_WEEK.map((day) => {
            const dayTemplates = templates.filter((t) => t.day_of_week === day.value)
            return (
              <div key={day.value}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{day.es}</h3>
                  <button
                    onClick={() => openNewTemplate(day.value)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={`Agregar clase el ${day.es}`}
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
                  </button>
                </div>
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
                          <div className="ml-auto flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditTemplate(t)}>
                              <FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(t.id)} className="text-destructive hover:text-destructive">
                              <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                            </Button>
                          </div>
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

      {tab === 'requests' && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {requestList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <FontAwesomeIcon icon={faEnvelope} className="w-6 h-6" />
              <p className="text-sm">No hay solicitudes de clase</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {requestList.map((req) => (
                <div key={req.id} className={`px-5 py-4 flex items-start gap-4 text-sm transition-colors ${req.acknowledged ? 'bg-secondary/40' : 'bg-white'}`}>
                  {/* Unread indicator */}
                  <div className="mt-1.5 shrink-0">
                    {!req.acknowledged
                      ? <span className="block w-2 h-2 rounded-full bg-[#F4EF71] ring-2 ring-[#F4EF71]/40" />
                      : <span className="block w-2 h-2 rounded-full bg-border" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-primary ${req.acknowledged ? 'opacity-60' : ''}`}>{req.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{req.email}</p>
                    {(req.preferred_day || req.preferred_time) && (
                      <p className="text-xs text-muted-foreground mt-1">{req.preferred_day} {req.preferred_time}</p>
                    )}
                    {req.class_type && (
                      <p className="text-xs text-muted-foreground">
                        {CLASS_TYPE_LABELS[req.class_type as keyof typeof CLASS_TYPE_LABELS]?.es}
                      </p>
                    )}
                    {req.message && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{req.message}"</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground shrink-0">
                    {new Date(req.created_at).toLocaleDateString('es-MX')}
                  </p>

                  <div className="flex gap-1 shrink-0">
                    {!req.acknowledged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAcknowledge(req.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Marcar como vista"
                      >
                        <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRequest(req.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Eliminar"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {templateModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-primary">
                {templateModal === 'new' ? 'Nueva plantilla' : 'Editar plantilla'}
              </h2>
              <button onClick={() => setTemplateModal(null)} className="text-muted-foreground hover:text-primary p-1">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Día</label>
                <select
                  value={templateForm.day_of_week}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, day_of_week: Number(e.target.value) }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>{d.es}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Hora de inicio</label>
                  <input
                    type="time"
                    value={templateForm.start_time}
                    onChange={(e) => setTemplateForm((f) => ({ ...f, start_time: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Duración (min)</label>
                  <input
                    type="number"
                    min="15"
                    step="5"
                    value={templateForm.duration_minutes}
                    onChange={(e) => setTemplateForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Tipo de clase</label>
                <select
                  value={templateForm.class_type}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, class_type: e.target.value as ClassType }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(CLASS_TYPE_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>{val.es}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Instructor</label>
                <select
                  value={templateForm.instructor_id}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, instructor_id: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Sin instructor</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Capacidad</label>
                <input
                  type="number"
                  min="1"
                  value={templateForm.capacity}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setTemplateModal(null)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground"
                  disabled={savingTemplate}
                  onClick={handleSaveTemplate}
                >
                  {savingTemplate ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
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
