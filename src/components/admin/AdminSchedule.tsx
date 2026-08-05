'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faPencil, faXmark, faRotateLeft, faEnvelope, faCheck, faTrash, faCalendarPlus, faClipboardList, faCircleCheck, faCircleXmark, faMinus, faLock, faLockOpen } from '@fortawesome/free-solid-svg-icons'
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
  events: ClassSession[]
  locale: string
  isAdmin?: boolean
}

export default function AdminSchedule({ sessions: initial, instructors, templates: initialTemplates, requests, events: initialEvents, locale, isAdmin = false }: Props) {
  const [sessions, setSessions] = useState(initial)
  const [templates, setTemplates] = useState(initialTemplates)
  const [requestList, setRequestList] = useState(requests)
  const [events, setEvents] = useState(initialEvents)
  const [tab, setTab] = useState<'upcoming' | 'recurring' | 'requests' | 'events'>('upcoming')
  const [editingSession, setEditingSession] = useState<ClassSession | null | 'new'>(null)
  const [generatingWeeks, setGeneratingWeeks] = useState(false)
  const [templateModal, setTemplateModal] = useState<RecurringTemplate | null | 'new'>(null)
  const [templateForm, setTemplateForm] = useState({ day_of_week: 1, start_time: '08:00', duration_minutes: 50, class_type: 'funcional' as ClassType, instructor_id: '', capacity: 5 })
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Attendance state
  const [attendanceSession, setAttendanceSession] = useState<ClassSession | null>(null)
  const [attendanceBookings, setAttendanceBookings] = useState<any[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null)

  // Add-booking state (admin only)
  const [showAddBooking, setShowAddBooking] = useState(false)
  const [addBookingType, setAddBookingType] = useState<'client' | 'guest'>('client')
  const [allClients, setAllClients] = useState<{ id: string; full_name: string | null; email: string }[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid')
  const [savingBooking, setSavingBooking] = useState(false)

  // Station management (Reformer classes)
  const REFORMER_TYPES = ['pilates_reformer', 'reformer_restaurativo']
  const STATION_ROWS = [[1, 2, 3, 4], [5, 6, 7, 8]]
  const [blockedStations, setBlockedStations] = useState<number[]>([])
  const [addBookingStation, setAddBookingStation] = useState<number | null>(null)
  const [togglingStation, setTogglingStation] = useState<number | null>(null)

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
      setEvents((prev) => prev.map((s) => s.id === session.id ? { ...s, status: 'cancelled' } : s))
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

  async function openAttendance(session: ClassSession) {
    setAttendanceSession(session)
    setBlockedStations(session.blocked_stations || [])
    setLoadingAttendance(true)
    const res = await fetch(`/api/admin/sessions/${session.id}/bookings`)
    if (res.ok) {
      const bookings = await res.json()
      setAttendanceBookings(bookings)
      // Sync spots_booked to actual confirmed booking count
      const count = bookings.length
      setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, spots_booked: count } : s))
      setEvents((prev) => prev.map((s) => s.id === session.id ? { ...s, spots_booked: count } : s))
    } else {
      toast.error('Error al cargar la lista')
    }
    setLoadingAttendance(false)
  }

  async function handleToggleBlock(station: number) {
    if (!attendanceSession) return
    const isBlocked = blockedStations.includes(station)
    setTogglingStation(station)
    const res = await fetch(`/api/admin/sessions/${attendanceSession.id}/block-station`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station, action: isBlocked ? 'unblock' : 'block' }),
    })
    if (res.ok) {
      const { blocked_stations } = await res.json()
      setBlockedStations(blocked_stations)
      setSessions((prev) => prev.map((s) => s.id === attendanceSession.id ? { ...s, blocked_stations } : s))
      setEvents((prev) => prev.map((s) => s.id === attendanceSession.id ? { ...s, blocked_stations } : s))
    } else {
      toast.error('Error al actualizar estación')
    }
    setTogglingStation(null)
  }

  async function markAttended(bookingId: string, value: boolean | null) {
    setSavingAttendance(bookingId)
    const res = await fetch(`/api/admin/bookings/${bookingId}/attended`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attended: value }),
    })
    if (res.ok) {
      setAttendanceBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, attended: value } : b))
    } else {
      toast.error('Error al guardar')
    }
    setSavingAttendance(null)
  }

  async function openAddBooking(station?: number | null) {
    setShowAddBooking(true)
    setAddBookingStation(station ?? null)
    setAddBookingType('client')
    setSelectedClientId('')
    setGuestName('')
    setGuestEmail('')
    setPaymentStatus('paid')
    if (allClients.length === 0) {
      setLoadingClients(true)
      const res = await fetch('/api/admin/clients')
      if (res.ok) setAllClients(await res.json())
      setLoadingClients(false)
    }
  }

  async function handleAddBooking() {
    if (!attendanceSession) return
    if (addBookingType === 'client' && !selectedClientId) { toast.error('Selecciona un cliente'); return }
    if (addBookingType === 'guest' && !guestName.trim()) { toast.error('El nombre es requerido'); return }
    if (REFORMER_TYPES.includes(attendanceSession.class_type) && !addBookingStation) { toast.error('Selecciona una estación'); return }
    setSavingBooking(true)
    const body: any = { payment_status: paymentStatus }
    if (addBookingType === 'client') {
      body.user_id = selectedClientId
    } else {
      body.guest_name = guestName.trim()
      if (guestEmail.trim()) body.guest_email = guestEmail.trim()
    }
    if (addBookingStation) body.station = addBookingStation
    const res = await fetch(`/api/admin/sessions/${attendanceSession.id}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      setAttendanceBookings((prev) => [...prev, data])
      setSessions((prev) => prev.map((s) => s.id === attendanceSession.id ? { ...s, spots_booked: s.spots_booked + 1 } : s))
      setShowAddBooking(false)
      toast.success('Persona agregada')
    } else {
      toast.error(data.error || 'Error al agregar')
    }
    setSavingBooking(false)
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
            { key: 'events', label: `✨ Eventos${events.length > 0 ? ` (${events.length})` : ''}` },
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
                    <div key={session.id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''} ${(session as any).is_special ? 'bg-[#F4EF71]/10' : ''}`}>
                      {(session as any).is_special ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-[#F4EF71] bg-[#F4EF71]/30 text-primary shrink-0">
                          ✨ {(session as any).event_type_label || 'Especial'}
                        </span>
                      ) : (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
                          {label.es}
                        </span>
                      )}
                      <span className="text-sm font-medium text-primary">{session.start_time.slice(0, 5)}</span>
                      <span className="text-sm text-muted-foreground truncate">
                        {(session as any).is_special && (session as any).event_title
                          ? (session as any).event_title
                          : (session as any).instructor?.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {session.capacity - session.spots_booked} / {session.capacity} lugares
                      </span>
                      {session.status === 'cancelled' && (
                        <Badge variant="destructive" className="text-xs">Cancelada</Badge>
                      )}
                      <div className="ml-auto flex gap-1">
                        {session.status !== 'cancelled' && (
                          <Button variant="ghost" size="sm" onClick={() => openAttendance(session)} title="Tomar lista">
                            <FontAwesomeIcon icon={faClipboardList} className="w-3.5 h-3.5" />
                          </Button>
                        )}
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

      {tab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Clases únicas y eventos especiales. Se muestran en la página de clases con un banner destacado.
            </p>
            <Button
              size="sm"
              onClick={() => setEditingSession('new')}
              className="bg-primary text-primary-foreground shrink-0 ml-4"
            >
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 mr-1.5" />
              Nuevo evento
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="bg-white rounded-xl border border-border flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <span className="text-3xl">✨</span>
              <p className="text-sm">No hay eventos especiales</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const dateFormatted = format(parseISO(event.date), "EEEE d 'de' MMMM yyyy", { locale: es })
                const spotsLeft = event.capacity - event.spots_booked
                const isPast = new Date(`${event.date}T${event.start_time}`) < new Date()
                return (
                  <div
                    key={event.id}
                    className={`bg-white rounded-xl border-2 ${isPast ? 'border-border opacity-60' : 'border-[#F4EF71]'} overflow-hidden`}
                  >
                    <div className={`px-4 py-3 flex items-start gap-3 ${isPast ? '' : 'bg-[#F4EF71]/10'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-[#F4EF71] bg-[#F4EF71]/40 text-primary">
                            ✨ {(event as any).event_type_label || 'Especial'}
                          </span>
                          {event.status === 'cancelled' && (
                            <Badge variant="destructive" className="text-xs">Cancelada</Badge>
                          )}
                          {isPast && <span className="text-xs text-muted-foreground">Pasado</span>}
                        </div>
                        <p className="font-semibold text-primary leading-tight">
                          {(event as any).event_title || 'Evento especial'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {dateFormatted} · {event.start_time.slice(0, 5)} · {event.duration_minutes}min
                        </p>
                        {(event as any).event_description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{(event as any).event_description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {(event as any).instructor?.name && `${(event as any).instructor.name} · `}
                          {event.spots_booked}/{event.capacity} reservas
                          {spotsLeft <= 0 ? ' · Lleno' : spotsLeft <= 3 ? ` · ¡Solo ${spotsLeft} lugar${spotsLeft === 1 ? '' : 'es'}!` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {event.status !== 'cancelled' && (
                          <Button variant="ghost" size="sm" onClick={() => openAttendance(event)} title="Tomar lista">
                            <FontAwesomeIcon icon={faClipboardList} className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setEditingSession(event)}>
                          <FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5" />
                        </Button>
                        {event.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(event)}
                            className="text-destructive hover:text-destructive"
                          >
                            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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

      {attendanceSession !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div>
                <h2 className="font-semibold text-primary">Lista de asistencia</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {CLASS_TYPE_LABELS[attendanceSession.class_type]?.es} · {attendanceSession.start_time.slice(0, 5)} · {format(parseISO(attendanceSession.date), "d 'de' MMMM", { locale: es })}
                </p>
              </div>
              <button onClick={() => { setAttendanceSession(null); setShowAddBooking(false) }} className="text-muted-foreground hover:text-primary p-1">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-2">
              {/* Station grid — Reformer classes only */}
              {!loadingAttendance && REFORMER_TYPES.includes(attendanceSession.class_type) && (
                <div className="mb-4 pb-4 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Estaciones</p>
                  <div className="space-y-2">
                    {STATION_ROWS.map((row, rowIdx) => (
                      <div key={rowIdx} className="flex gap-2 justify-center">
                        {row.map((num) => {
                          const booking = attendanceBookings.find((b) => b.station === num)
                          const isBlocked = blockedStations.includes(num)
                          const isBooked = !!booking
                          const firstName = (booking?.profile?.full_name || booking?.guest_name || '')
                            .split(' ')[0].slice(0, 8)

                          return (
                            <div key={num} className="flex flex-col items-center gap-0.5 w-14">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                                isBlocked
                                  ? 'bg-red-50 text-red-400 border-red-200'
                                  : isBooked
                                    ? 'bg-[#F4EF71] text-primary border-[#F4EF71]'
                                    : 'bg-secondary text-muted-foreground border-border'
                              }`}>
                                {num}
                              </div>
                              <p className="text-[10px] text-center text-muted-foreground leading-tight truncate w-full px-0.5">
                                {isBlocked ? 'Bloq.' : firstName || ''}
                              </p>
                              {!isBooked && (
                                <div className="flex gap-0.5 mt-0.5">
                                  {!isBlocked && (
                                    <button
                                      title="Reservar esta estación"
                                      onClick={() => openAddBooking(num)}
                                      className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                                    >
                                      <FontAwesomeIcon icon={faPlus} className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                  <button
                                    title={isBlocked ? 'Desbloquear' : 'Bloquear'}
                                    disabled={togglingStation === num}
                                    onClick={() => handleToggleBlock(num)}
                                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                                      isBlocked
                                        ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                                        : 'text-muted-foreground hover:text-red-400 hover:bg-red-50'
                                    }`}
                                  >
                                    <FontAwesomeIcon icon={isBlocked ? faLockOpen : faLock} className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingAttendance ? (
                <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
              ) : attendanceBookings.length === 0 && !showAddBooking ? (
                <p className="text-sm text-muted-foreground text-center py-8">No hay personas registradas</p>
              ) : (
                attendanceBookings.map((booking) => {
                  const name = booking.profile?.full_name || booking.guest_name || booking.guest_email || 'Sin nombre'
                  const email = booking.profile?.email || booking.guest_email || ''
                  const attended = booking.attended
                  return (
                    <div key={booking.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-secondary/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-primary truncate">{name}</p>
                          {booking.payment_status === 'pending' && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 shrink-0">Pago pendiente</span>
                          )}
                          {booking.payment_status === 'paid' && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 border border-green-200 shrink-0">Pagado</span>
                          )}
                        </div>
                        {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          disabled={savingAttendance === booking.id}
                          onClick={() => markAttended(booking.id, attended === true ? null : true)}
                          title="Asistió"
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            attended === true
                              ? 'bg-green-100 text-green-600 ring-2 ring-green-400'
                              : 'text-muted-foreground hover:bg-green-50 hover:text-green-500'
                          }`}
                        >
                          <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4" />
                        </button>
                        <button
                          disabled={savingAttendance === booking.id}
                          onClick={() => markAttended(booking.id, attended === false ? null : false)}
                          title="No asistió"
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            attended === false
                              ? 'bg-red-100 text-red-500 ring-2 ring-red-400'
                              : 'text-muted-foreground hover:bg-red-50 hover:text-red-400'
                          }`}
                        >
                          <FontAwesomeIcon icon={faCircleXmark} className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Add booking form — admin only */}
              {isAdmin && showAddBooking && (
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                  <p className="text-sm font-medium text-primary">Agregar persona</p>

                  {/* Station picker — Reformer classes only */}
                  {attendanceSession && REFORMER_TYPES.includes(attendanceSession.class_type) && (
                    <div>
                      <label className="text-xs font-medium text-primary block mb-2">
                        Estación <span className="text-destructive">*</span>
                      </label>
                      <div className="space-y-1.5">
                        {STATION_ROWS.map((row, rowIdx) => (
                          <div key={rowIdx} className="flex gap-1.5 justify-center">
                            {row.map((num) => {
                              const isTaken = attendanceBookings.some((b) => b.station === num)
                              const isBlocked = blockedStations.includes(num)
                              const isSelected = addBookingStation === num
                              const isDisabled = isTaken || isBlocked
                              return (
                                <button
                                  key={num}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => setAddBookingStation(isSelected ? null : num)}
                                  className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all ${
                                    isDisabled
                                      ? 'bg-muted text-muted-foreground border-border opacity-40 cursor-not-allowed'
                                      : isSelected
                                        ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-md'
                                        : 'bg-[#F4EF71] text-primary border-[#F4EF71] hover:border-primary hover:scale-105'
                                  }`}
                                >
                                  {num}
                                </button>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Client / Guest toggle */}
                  <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
                    {(['client', 'guest'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAddBookingType(t)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${addBookingType === t ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`}
                      >
                        {t === 'client' ? 'Cliente registrado' : 'Invitado'}
                      </button>
                    ))}
                  </div>

                  {addBookingType === 'client' ? (
                    <div>
                      <label className="text-xs font-medium text-primary block mb-1">Cliente</label>
                      {loadingClients ? (
                        <p className="text-xs text-muted-foreground">Cargando clientes...</p>
                      ) : (
                        <select
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">Seleccionar cliente...</option>
                          {allClients.map((c) => (
                            <option key={c.id} value={c.id}>{c.full_name || c.email} {c.full_name ? `(${c.email})` : ''}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-primary block mb-1">Nombre *</label>
                        <input
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Nombre completo"
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-primary block mb-1">Correo (opcional)</label>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment status */}
                  <div>
                    <label className="text-xs font-medium text-primary block mb-1">Pago</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPaymentStatus('paid')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${paymentStatus === 'paid' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-muted-foreground border-border hover:border-green-300'}`}
                      >
                        Ya pagó
                      </button>
                      <button
                        onClick={() => setPaymentStatus('pending')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${paymentStatus === 'pending' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-muted-foreground border-border hover:border-orange-300'}`}
                      >
                        Pagará antes de clase
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowAddBooking(false)}>Cancelar</Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-primary text-primary-foreground"
                      disabled={savingBooking || !!(attendanceSession && REFORMER_TYPES.includes(attendanceSession.class_type) && !addBookingStation)}
                      onClick={handleAddBooking}
                    >
                      {savingBooking ? 'Guardando...' : 'Agregar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border shrink-0 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {attendanceBookings.filter(b => b.attended === true).length} asistieron ·{' '}
                {attendanceBookings.filter(b => b.attended === false).length} no asistieron ·{' '}
                {attendanceBookings.filter(b => b.attended === null).length} sin marcar
              </span>
              <div className="flex gap-2 shrink-0">
                {isAdmin && !showAddBooking && (
                  <Button size="sm" variant="outline" onClick={() => openAddBooking()}>
                    <FontAwesomeIcon icon={faPlus} className="w-3 h-3 mr-1" />
                    Agregar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setAttendanceSession(null); setShowAddBooking(false) }}>Cerrar</Button>
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
          defaultSpecial={tab === 'events'}
          onClose={() => setEditingSession(null)}
          onSaved={() => { setEditingSession(null); window.location.reload() }}
        />
      )}
    </div>
  )
}
