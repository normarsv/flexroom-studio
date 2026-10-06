'use client'

import { useState } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faPencil, faXmark, faRotateLeft, faEnvelope, faCheck, faTrash, faCalendarPlus, faClipboardList, faCircleCheck, faCircleXmark, faMinus, faLock, faLockOpen, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClassSession, ClassType, ClassTypeConfig, Instructor, RecurringTemplate } from '@/types'
import { CLASS_TYPE_LABELS, CLASS_TYPE_COLORS, DAYS_OF_WEEK } from '@/lib/constants'
import { toast } from 'sonner'
import SessionFormModal from './SessionFormModal'

interface Props {
  sessions: ClassSession[]
  instructors: Instructor[]
  templates: RecurringTemplate[]
  requests: any[]
  events: ClassSession[]
  classTypes: ClassTypeConfig[]
  locale: string
  isAdmin?: boolean
  waitlistCounts?: Record<string, number>
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function AdminSchedule({ sessions: initial, instructors, templates: initialTemplates, requests, events: initialEvents, classTypes: initialClassTypes, locale, isAdmin = false, waitlistCounts: initialWaitlistCounts = {} }: Props) {
  const [sessions, setSessions] = useState(initial)
  const [templates, setTemplates] = useState(initialTemplates)
  const [requestList, setRequestList] = useState(requests)
  const [events, setEvents] = useState(initialEvents)
  const [classTypes, setClassTypes] = useState<ClassTypeConfig[]>(initialClassTypes)
  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, number>>(initialWaitlistCounts)
  const [tab, setTab] = useState<'upcoming' | 'past' | 'recurring' | 'requests' | 'events' | 'types' | 'calendar'>('upcoming')

  // Past sessions state
  const todayMx = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  const defaultPastFrom = (() => {
    const d = new Date(todayMx + 'T00:00:00')
    d.setDate(d.getDate() - 7)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  })()
  const [pastFrom, setPastFrom] = useState(defaultPastFrom)
  const [pastTo, setPastTo] = useState(todayMx)
  const [pastSessions, setPastSessions] = useState<ClassSession[] | null>(null)
  const [loadingPast, setLoadingPast] = useState(false)

  async function loadPastSessions(from: string, to: string) {
    setLoadingPast(true)
    const res = await fetch(`/api/admin/sessions?from=${from}&to=${to}`)
    if (res.ok) {
      setPastSessions(await res.json())
    } else {
      toast.error('Error al cargar clases anteriores')
    }
    setLoadingPast(false)
  }

  // Helpers for dynamic class type display
  const getTypeLabel = (key: string) =>
    classTypes.find(ct => ct.key === key)?.name_es || CLASS_TYPE_LABELS[key as keyof typeof CLASS_TYPE_LABELS]?.es || key
  const getTypeBadgeStyle = (key: string) => {
    const ct = classTypes.find(c => c.key === key)
    const hex = ct?.color || '#868686'
    return { background: hexToRgba(hex, 0.2), borderColor: hexToRgba(hex, 0.5), color: '#1E1E1E' }
  }

  // Class types management state
  const [typeForm, setTypeForm] = useState({ name_es: '', name_en: '', color: '#F4EF71', price_mxn: 150 })
  const [savingType, setSavingType] = useState(false)
  const [editingType, setEditingType] = useState<ClassTypeConfig | null>(null)
  const [editingSession, setEditingSession] = useState<ClassSession | null | 'new'>(null)
  const [generatingWeeks, setGeneratingWeeks] = useState(false)
  const [templateModal, setTemplateModal] = useState<RecurringTemplate | null | 'new'>(null)
  const [templateForm, setTemplateForm] = useState({ day_of_week: 1, start_time: '08:00', duration_minutes: 50, class_type: 'funcional' as ClassType, instructor_id: '', capacity: 5 })
  const [savingTemplate, setSavingTemplate] = useState(false)

  type CancelRegistrant = { name: string; phone: string | null; isGuest: boolean; refundType: 'package' | 'credit' | 'none' | 'guest' }
  // Cancel result modal state — cached per session id so it survives close
  const [cancelResult, setCancelResult] = useState<{ session: ClassSession; registrants: CancelRegistrant[] } | null>(null)
  const [cancelCache, setCancelCache] = useState<Record<string, CancelRegistrant[]>>({})
  const [whatsappMsg, setWhatsappMsg] = useState('')
  const [loadingCancelSummary, setLoadingCancelSummary] = useState(false)

  // Attendance state
  const [attendanceSession, setAttendanceSession] = useState<ClassSession | null>(null)
  const [attendanceBookings, setAttendanceBookings] = useState<any[]>([])
  const [waitlistBookings, setWaitlistBookings] = useState<any[]>([])
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
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null)

  // Station management (Reformer classes)
  const REFORMER_TYPES = ['pilates_reformer', 'reformer_restaurativo']
  const STATION_ROWS = [[1, 2, 3, 4], [5, 6, 7, 8]]
  const [blockedStations, setBlockedStations] = useState<number[]>([])
  const [addBookingStation, setAddBookingStation] = useState<number | null>(null)
  const [togglingStation, setTogglingStation] = useState<number | null>(null)
  const [promotingBooking, setPromotingBooking] = useState<{ id: string; name: string } | null>(null)
  const [promoteStation, setPromoteStation] = useState<number | null>(null)
  const [savingPromotion, setSavingPromotion] = useState(false)

  const sessionsByDate = sessions.reduce<Record<string, ClassSession[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  const [calendarWeekStart, setCalendarWeekStart] = useState(() => {
    const today = new Date()
    const dow = today.getDay()
    const monday = addDays(today, dow === 0 ? -6 : 1 - dow)
    monday.setHours(0, 0, 0, 0)
    return monday
  })
  const [showCalendarDatePicker, setShowCalendarDatePicker] = useState(false)
  const calendarDays = Array.from({ length: 7 }, (_, i) => addDays(calendarWeekStart, i))
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const getTypeColor = (key: string) => classTypes.find(c => c.key === key)?.color || '#868686'

  async function handleCancel(session: ClassSession) {
    if (!confirm('¿Cancelar esta clase? Se reembolsarán los créditos automáticamente a los registrados.')) return
    const res = await fetch(`/api/admin/sessions/${session.id}/cancel`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, status: 'cancelled' } : s))
      setEvents((prev) => prev.map((s) => s.id === session.id ? { ...s, status: 'cancelled' } : s))
      toast.success('Clase cancelada')
      if (data.registrants?.length > 0) {
        setCancelCache(prev => ({ ...prev, [session.id]: data.registrants }))
        const dateLabel = `${getTypeLabel(session.class_type)} del ${format(parseISO(session.date), "d 'de' MMMM", { locale: es })} a las ${session.start_time.slice(0, 5)}`
        setWhatsappMsg(`Hola, te avisamos que la clase de ${dateLabel} ha sido cancelada. Disculpa los inconvenientes.`)
        setCancelResult({ session, registrants: data.registrants })
      }
    } else {
      toast.error('Error al cancelar')
    }
  }

  async function handleUncancel(session: ClassSession) {
    if (!confirm('¿Reactivar esta clase? Se restaurarán las reservas y se revertirán los reembolsos otorgados.')) return
    const res = await fetch(`/api/admin/sessions/${session.id}/uncancel`, { method: 'POST' })
    if (res.ok) {
      setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, status: 'scheduled' } : s))
      setEvents((prev) => prev.map((s) => s.id === session.id ? { ...s, status: 'scheduled' } : s))
      toast.success('Clase reactivada')
    } else {
      toast.error('Error al reactivar')
    }
  }

  function buildWhatsappUrl(phone: string, name: string) {
    const digits = phone.replace(/\D/g, '')
    // Add Mexico country code if not present (10-digit MX numbers)
    const intl = digits.startsWith('52') ? digits : `52${digits}`
    const msg = whatsappMsg.replace('[nombre]', name)
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`
  }

  async function openCancelModal(session: ClassSession) {
    const dateLabel = `${getTypeLabel(session.class_type)} del ${format(parseISO(session.date), "d 'de' MMMM", { locale: es })} a las ${session.start_time.slice(0, 5)}`
    setWhatsappMsg(`Hola, te avisamos que la clase de ${dateLabel} ha sido cancelada. Disculpa los inconvenientes.`)
    // Use cached data if available, otherwise fetch
    if (cancelCache[session.id]) {
      setCancelResult({ session, registrants: cancelCache[session.id] })
      return
    }
    setLoadingCancelSummary(true)
    const res = await fetch(`/api/admin/sessions/${session.id}/cancel`)
    if (res.ok) {
      const data = await res.json()
      setCancelCache(prev => ({ ...prev, [session.id]: data.registrants }))
      setCancelResult({ session, registrants: data.registrants })
    } else {
      toast.error('Error al cargar registros')
    }
    setLoadingCancelSummary(false)
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

  async function handleDeleteEvent(event: ClassSession) {
    const hasBookings = event.spots_booked > 0
    const message = hasBookings
      ? `¿Eliminar este evento permanentemente? Tiene ${event.spots_booked} reserva(s) que también se eliminarán. Esta acción no se puede deshacer.`
      : '¿Eliminar este evento permanentemente? Esta acción no se puede deshacer.'
    if (!confirm(message)) return
    const res = await fetch(`/api/admin/sessions/${event.id}`, { method: 'DELETE' })
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== event.id))
      toast.success('Evento eliminado')
    } else {
      toast.error('Error al eliminar el evento')
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
    setWaitlistBookings([])
    const [bookingsRes, waitlistRes] = await Promise.all([
      fetch(`/api/admin/sessions/${session.id}/bookings`),
      fetch(`/api/admin/sessions/${session.id}/waitlist`),
    ])
    if (bookingsRes.ok) {
      const bookings = await bookingsRes.json()
      setAttendanceBookings(bookings)
      // Sync spots_booked to actual confirmed booking count
      const count = bookings.length
      setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, spots_booked: count } : s))
      setEvents((prev) => prev.map((s) => s.id === session.id ? { ...s, spots_booked: count } : s))
    } else {
      toast.error('Error al cargar la lista')
    }
    if (waitlistRes.ok) {
      setWaitlistBookings(await waitlistRes.json())
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

  async function handleCancelBooking(bookingId: string, paymentStatus: string, userId: string | null) {
    const isPaid = paymentStatus === 'paid'
    const isGuest = !userId
    let msg: string
    if (isGuest) {
      msg = '¿Cancelar esta reserva?\n\nEste cliente fue agregado como invitado — no tiene cuenta registrada, por lo que no se puede otorgar crédito automáticamente. Contacta directamente al cliente si aplica un reembolso o acuerdo.'
    } else if (isPaid) {
      msg = '¿Cancelar esta reserva? El cliente recibirá un crédito de cancelación.'
    } else {
      msg = '¿Cancelar esta reserva? El cliente no recibirá crédito (pago pendiente).'
    }
    if (!confirm(msg)) return
    setCancellingBooking(bookingId)
    const res = await fetch(`/api/admin/bookings/${bookingId}/cancel`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setAttendanceBookings((prev) => prev.filter((b) => b.id !== bookingId))
      setSessions((prev) => prev.map((s) =>
        s.id === attendanceSession?.id ? { ...s, spots_booked: Math.max(0, s.spots_booked - 1) } : s
      ))
      toast.success(data.creditGranted ? 'Reserva cancelada — crédito otorgado' : 'Reserva cancelada')
    } else {
      toast.error(data.error || 'Error al cancelar')
    }
    setCancellingBooking(null)
  }

  async function handlePromote(bookingId: string, station?: number) {
    setSavingPromotion(true)
    const res = await fetch(`/api/admin/bookings/${bookingId}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station: station || null }),
    })
    if (res.ok) {
      setWaitlistBookings((prev) => prev.filter((b) => b.id !== bookingId))
      setSessions((prev) => prev.map((s) => s.id === attendanceSession?.id ? { ...s, spots_booked: s.spots_booked + 1 } : s))
      if (attendanceSession) {
        setWaitlistCounts((prev) => {
          const n = (prev[attendanceSession.id] || 1) - 1
          return { ...prev, [attendanceSession.id]: Math.max(0, n) }
        })
        const bookingsRes = await fetch(`/api/admin/sessions/${attendanceSession.id}/bookings`)
        if (bookingsRes.ok) setAttendanceBookings(await bookingsRes.json())
      }
      setPromotingBooking(null)
      setPromoteStation(null)
      toast.success('Persona promovida a confirmada')
    } else {
      const data = await res.json()
      toast.error(data.error || 'Error al promover')
    }
    setSavingPromotion(false)
  }

  function buildWaitlistWhatsappUrl(phone: string, name: string, session: ClassSession) {
    const digits = phone.replace(/\D/g, '')
    const intl = digits.startsWith('52') ? digits : `52${digits}`
    const dateLabel = format(parseISO(session.date), "d 'de' MMMM", { locale: es })
    const msg = `Hola ${name}, te informamos que se liberó un lugar en la clase de ${getTypeLabel(session.class_type)} del ${dateLabel} a las ${session.start_time.slice(0, 5)}. ¿Te gustaría confirmarlo?`
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`
  }

  async function generateFromTemplates() {
    setGeneratingWeeks(true)
    const res = await fetch('/api/admin/sessions/generate', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      const parts = []
      if (data.created > 0) parts.push(`${data.created} creadas`)
      if (data.deleted > 0) parts.push(`${data.deleted} eliminadas`)
      toast.success(parts.length > 0 ? `Horario sincronizado: ${parts.join(', ')}` : 'Horario ya estaba al día')
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
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6 overflow-x-auto">
        {([
            { key: 'calendar', label: '📅 Calendario' },
            { key: 'upcoming', label: 'Próximas clases' },
            { key: 'past', label: 'Clases anteriores' },
            { key: 'events', label: `✨ Eventos${events.length > 0 ? ` (${events.length})` : ''}` },
            { key: 'recurring', label: 'Plantillas semanales' },
            { key: 'requests', label: `Solicitudes${requestList.filter(r => !r.acknowledged).length > 0 ? ` (${requestList.filter(r => !r.acknowledged).length})` : ''}` },
            { key: 'types', label: 'Tipos de clase' },
          ] as { key: typeof tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
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
                  const label = { es: getTypeLabel(session.class_type) }
                  const badgeStyle = getTypeBadgeStyle(session.class_type)
                  return (
                    <div key={session.id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''} ${(session as any).is_special ? 'bg-[#F4EF71]/10' : ''}`}>
                      {(session as any).is_special ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-[#F4EF71] bg-[#F4EF71]/30 text-primary shrink-0">
                          ✨ {(session as any).event_type_label || 'Especial'}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={badgeStyle}>
                          {label.es}
                        </span>
                      )}
                      <span className="text-sm font-medium text-primary">{session.start_time.slice(0, 5)}</span>
                      <span className="text-sm text-muted-foreground truncate">
                        {(session as any).custom_title
                          || ((session as any).is_special ? (session as any).event_title : null)
                          || (session as any).instructor?.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {session.spots_booked} / {session.capacity} lugares
                      </span>
                      {session.status === 'cancelled' && (
                        <Badge variant="destructive" className="text-xs">Cancelada</Badge>
                      )}
                      {(waitlistCounts[session.id] ?? 0) > 0 && session.status !== 'cancelled' && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 shrink-0">
                          {waitlistCounts[session.id]} en espera
                        </span>
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
                        {session.status !== 'cancelled' ? (
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(session)} className="text-destructive hover:text-destructive">
                            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openCancelModal(session)} disabled={loadingCancelSummary} title="Ver registrados / WhatsApp" className="text-green-600 hover:text-green-700">
                              <FontAwesomeIcon icon={faWhatsapp} className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleUncancel(session)} className="text-muted-foreground hover:text-primary" title="Reactivar clase">
                              <FontAwesomeIcon icon={faRotateRight} className="w-3.5 h-3.5" />
                            </Button>
                          </>
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

      {tab === 'past' && (
        <div className="space-y-4">
          {/* Date range filter */}
          <div className="flex flex-wrap items-end gap-3 bg-white rounded-xl border border-border p-4">
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Desde</label>
              <input
                type="date"
                value={pastFrom}
                max={pastTo}
                onChange={(e) => setPastFrom(e.target.value)}
                className="border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Hasta</label>
              <input
                type="date"
                value={pastTo}
                max={todayMx}
                onChange={(e) => setPastTo(e.target.value)}
                className="border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              onClick={() => loadPastSessions(pastFrom, pastTo)}
              disabled={loadingPast || !pastFrom || !pastTo}
              className="bg-primary text-primary-foreground"
            >
              {loadingPast ? 'Cargando...' : 'Buscar'}
            </Button>
            <div className="flex gap-2 ml-auto">
              {[
                { label: 'Semana anterior', days: 7 },
                { label: '30 días', days: 30 },
                { label: '90 días', days: 90 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => {
                    const d = new Date(todayMx + 'T00:00:00')
                    d.setDate(d.getDate() - days)
                    const from = d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
                    setPastFrom(from)
                    setPastTo(todayMx)
                    loadPastSessions(from, todayMx)
                  }}
                  className="px-3 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {pastSessions === null ? (
            <div className="bg-white rounded-xl border border-border flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <p className="text-sm">Selecciona un rango y presiona Buscar</p>
            </div>
          ) : loadingPast ? (
            <div className="bg-white rounded-xl border border-border flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : pastSessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-border flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No hay clases en este rango de fechas</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(
                pastSessions.reduce<Record<string, ClassSession[]>>((acc, s) => {
                  if (!acc[s.date]) acc[s.date] = []
                  acc[s.date].push(s)
                  return acc
                }, {})
              )
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([dateStr, daySessions]) => (
                  <div key={dateStr}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 capitalize">
                      {format(parseISO(dateStr), "EEEE d 'de' MMMM", { locale: es })}
                    </h3>
                    <div className="bg-white rounded-xl border border-border overflow-hidden">
                      {daySessions.map((session, idx) => {
                        const label = { es: getTypeLabel(session.class_type) }
                        const badgeStyle = getTypeBadgeStyle(session.class_type)
                        return (
                          <div key={session.id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''} opacity-80`}>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={badgeStyle}>
                              {label.es}
                            </span>
                            <span className="text-sm font-medium text-primary">{session.start_time.slice(0, 5)}</span>
                            <span className="text-sm text-muted-foreground truncate">
                              {(session as any).custom_title || (session as any).instructor?.name || ''}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {session.spots_booked} / {session.capacity} lugares
                            </span>
                            {session.status === 'cancelled' && (
                              <Badge variant="destructive" className="text-xs">Cancelada</Badge>
                            )}
                            <div className="ml-auto flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openAttendance(session)} title="Ver lista">
                                <FontAwesomeIcon icon={faClipboardList} className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
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
                        {event.status !== 'cancelled' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(event)}
                            className="text-destructive hover:text-destructive"
                            title="Cancelar evento"
                          >
                            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openCancelModal(event)} disabled={loadingCancelSummary} title="Ver registrados / WhatsApp" className="text-green-600 hover:text-green-700">
                              <FontAwesomeIcon icon={faWhatsapp} className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleUncancel(event)} className="text-muted-foreground hover:text-primary" title="Reactivar evento">
                              <FontAwesomeIcon icon={faRotateRight} className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event)}
                          className="text-destructive hover:text-destructive"
                          title="Eliminar evento permanentemente"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                        </Button>
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
              Agregar clase
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
                      return (
                        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={getTypeBadgeStyle(t.class_type)}>{getTypeLabel(t.class_type)}</span>
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
                        {getTypeLabel(req.class_type)}
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
                  {(classTypes.length > 0 ? classTypes : Object.entries(CLASS_TYPE_LABELS).map(([key, val]) => ({ key, name_es: val.es }))).map((ct: any) => (
                    <option key={ct.key} value={ct.key}>{ct.name_es}</option>
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
                  {getTypeLabel(attendanceSession.class_type)} · {attendanceSession.start_time.slice(0, 5)} · {format(parseISO(attendanceSession.date), "d 'de' MMMM", { locale: es })}
                </p>
              </div>
              <button onClick={() => { setAttendanceSession(null); setShowAddBooking(false); setWaitlistBookings([]) }} className="text-muted-foreground hover:text-primary p-1">
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
                        {isAdmin && (
                          <button
                            disabled={cancellingBooking === booking.id}
                            onClick={() => handleCancelBooking(booking.id, booking.payment_status, booking.user_id)}
                            title="Cancelar reserva"
                            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                          >
                            <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                          </button>
                        )}
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

            {/* Waitlist section — always shown */}
            {!loadingAttendance && (
              <div className="px-5 pb-4 border-t border-border pt-4 shrink-0">
                {/* Alert when there are waitlisted people AND a free spot */}
                {(() => {
                  if (!attendanceSession || waitlistBookings.length === 0) return null
                  const isReformer = REFORMER_TYPES.includes(attendanceSession.class_type)
                  const spotsLeft = isReformer
                    ? (8 - (attendanceSession.blocked_stations?.length ?? 0)) - attendanceSession.spots_booked
                    : attendanceSession.capacity - attendanceSession.spots_booked
                  if (spotsLeft <= 0) return null
                  return (
                    <div className="mb-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs">
                      <span className="text-base leading-none shrink-0">⚠️</span>
                      <span>Hay <strong>{spotsLeft} lugar{spotsLeft !== 1 ? 'es' : ''} disponible{spotsLeft !== 1 ? 's' : ''}</strong> y {waitlistBookings.length} persona{waitlistBookings.length !== 1 ? 's' : ''} en lista de espera. Considera promoverlas.</span>
                    </div>
                  )
                })()}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Lista de espera ({waitlistBookings.length})
                </p>
                {waitlistBookings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nadie en lista de espera</p>
                ) : (
                <div className="space-y-1.5">
                  {waitlistBookings.map((b, i) => {
                    const name = b.profile?.full_name || b.guest_name || b.guest_email || 'Sin nombre'
                    const email = b.profile?.email || b.guest_email || ''
                    const isReformer = attendanceSession && REFORMER_TYPES.includes(attendanceSession.class_type)
                    return (
                      <div key={b.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/40 border border-border">
                        <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-primary truncate">{name}</p>
                          {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            {b.profile?.phone && attendanceSession && (
                              <a
                                href={buildWaitlistWhatsappUrl(b.profile.phone, name, attendanceSession)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Avisar por WhatsApp"
                                className="w-7 h-7 rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
                              >
                                <FontAwesomeIcon icon={faWhatsapp} className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                if (isReformer) {
                                  setPromotingBooking({ id: b.id, name })
                                  setPromoteStation(null)
                                } else {
                                  handlePromote(b.id)
                                }
                              }}
                              title="Mover a confirmadas"
                              className="text-xs font-medium px-2 py-1 rounded-lg bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 transition-colors"
                            >
                              Promover
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                )}
              </div>
            )}

            {/* Station picker for waitlist promotion (Reformer only) */}
            {promotingBooking && attendanceSession && (
              <div className="px-5 pb-4 border-t border-border pt-4 shrink-0 bg-green-50/60">
                <p className="text-xs font-semibold text-primary mb-2">
                  Asignar estación a {promotingBooking.name}
                </p>
                <div className="space-y-1.5 mb-3">
                  {STATION_ROWS.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex gap-1.5 justify-center">
                      {row.map((num) => {
                        const isTaken = attendanceBookings.some((b) => b.station === num)
                        const isBlocked = blockedStations.includes(num)
                        const isSelected = promoteStation === num
                        const isDisabled = isTaken || isBlocked
                        return (
                          <button
                            key={num}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setPromoteStation(isSelected ? null : num)}
                            className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all ${
                              isDisabled
                                ? 'bg-muted text-muted-foreground border-border opacity-40 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-green-600 text-white border-green-600 scale-110 shadow-md'
                                  : 'bg-[#F4EF71] text-primary border-[#F4EF71] hover:border-green-400 hover:scale-105'
                            }`}
                          >
                            {num}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setPromotingBooking(null); setPromoteStation(null) }}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 text-white hover:bg-green-700"
                    disabled={!promoteStation || savingPromotion}
                    onClick={() => handlePromote(promotingBooking.id, promoteStation!)}
                  >
                    {savingPromotion ? 'Guardando...' : 'Confirmar'}
                  </Button>
                </div>
              </div>
            )}

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
                <Button size="sm" variant="outline" onClick={() => { setAttendanceSession(null); setShowAddBooking(false); setWaitlistBookings([]) }}>Cerrar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TIPOS DE CLASE ─────────────────────────────────── */}
      {tab === 'types' && (
        <div className="space-y-6">
          {/* List */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            {classTypes.filter(ct => ct.is_active).length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No hay tipos de clase. Agrega uno abajo.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-primary">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-primary">Nombre (ES)</th>
                    <th className="text-left px-4 py-3 font-medium text-primary">Nombre (EN)</th>
                    <th className="text-left px-4 py-3 font-medium text-primary">Precio MXN</th>
                    <th className="text-left px-4 py-3 font-medium text-primary">Color</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {classTypes.filter(ct => ct.is_active).map((ct) => (
                    <tr key={ct.id} className="hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={getTypeBadgeStyle(ct.key)}>
                          {ct.name_es}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-primary">
                        {editingType?.id === ct.id ? (
                          <input value={editingType.name_es} onChange={(e) => setEditingType({ ...editingType, name_es: e.target.value })}
                            className="w-full px-2 py-1 rounded border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                        ) : ct.name_es}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {editingType?.id === ct.id ? (
                          <input value={editingType.name_en} onChange={(e) => setEditingType({ ...editingType, name_en: e.target.value })}
                            className="w-full px-2 py-1 rounded border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                        ) : ct.name_en}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {editingType?.id === ct.id ? (
                          <input type="number" value={editingType.price_mxn} onChange={(e) => setEditingType({ ...editingType, price_mxn: Number(e.target.value) })}
                            className="w-20 px-2 py-1 rounded border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                        ) : `$${ct.price_mxn}`}
                      </td>
                      <td className="px-4 py-3">
                        {editingType?.id === ct.id ? (
                          <input type="color" value={editingType.color} onChange={(e) => setEditingType({ ...editingType, color: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                        ) : (
                          <span className="inline-block w-5 h-5 rounded-full border border-border" style={{ background: ct.color }} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          {editingType?.id === ct.id ? (
                            <>
                              <Button size="sm" className="bg-primary text-primary-foreground" onClick={async () => {
                                setSavingType(true)
                                const res = await fetch(`/api/admin/class-types/${ct.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name_es: editingType.name_es, name_en: editingType.name_en, color: editingType.color, price_mxn: editingType.price_mxn }),
                                })
                                if (res.ok) {
                                  const updated = await res.json()
                                  setClassTypes(prev => prev.map(c => c.id === updated.id ? updated : c))
                                  setEditingType(null)
                                  toast.success('Tipo actualizado')
                                } else toast.error('Error al guardar')
                                setSavingType(false)
                              }} disabled={savingType}>Guardar</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingType(null)}>Cancelar</Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => setEditingType({ ...ct })}>
                                <FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => {
                                if (!confirm(`¿Desactivar "${ct.name_es}"? Las clases existentes no se verán afectadas.`)) return
                                const res = await fetch(`/api/admin/class-types/${ct.id}`, { method: 'DELETE' })
                                if (res.ok) {
                                  setClassTypes(prev => prev.map(c => c.id === ct.id ? { ...c, is_active: false } : c))
                                  toast.success('Tipo desactivado')
                                } else toast.error('Error al desactivar')
                              }}>
                                <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add new type form */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-6">
            <h3 className="text-sm font-semibold text-primary mb-4">Agregar tipo de clase</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Nombre en español *</label>
                <input value={typeForm.name_es} onChange={(e) => setTypeForm(f => ({ ...f, name_es: e.target.value }))}
                  placeholder="Ej: Yoga Restaurativo"
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Nombre en inglés</label>
                <input value={typeForm.name_en} onChange={(e) => setTypeForm(f => ({ ...f, name_en: e.target.value }))}
                  placeholder="Ej: Restorative Yoga"
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Precio por sesión (MXN)</label>
                <input type="number" value={typeForm.price_mxn} onChange={(e) => setTypeForm(f => ({ ...f, price_mxn: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Color del badge</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={typeForm.color} onChange={(e) => setTypeForm(f => ({ ...f, color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border border-border p-0.5" />
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ background: hexToRgba(typeForm.color, 0.2), borderColor: hexToRgba(typeForm.color, 0.5), color: '#1E1E1E' }}>
                    {typeForm.name_es || 'Vista previa'}
                  </span>
                </div>
              </div>
            </div>
            <Button
              className="bg-primary text-primary-foreground"
              disabled={savingType || !typeForm.name_es}
              onClick={async () => {
                setSavingType(true)
                const res = await fetch('/api/admin/class-types', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(typeForm),
                })
                if (res.ok) {
                  const newType = await res.json()
                  setClassTypes(prev => [...prev, newType])
                  setTypeForm({ name_es: '', name_en: '', color: '#F4EF71', price_mxn: 150 })
                  toast.success('Tipo de clase agregado')
                } else {
                  const err = await res.json()
                  toast.error(err.error || 'Error al guardar')
                }
                setSavingType(false)
              }}
            >
              {savingType ? 'Guardando...' : 'Agregar tipo'}
            </Button>
          </div>
        </div>
      )}

      {/* ── CALENDAR VIEW ─────────────────────────────────── */}
      {tab === 'calendar' && (
        <div>
          {/* Week navigation */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setCalendarWeekStart(d => { const p = addDays(d, -7); p.setHours(0,0,0,0); return p })}
              className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const dow = today.getDay()
                const monday = addDays(today, dow === 0 ? -6 : 1 - dow)
                monday.setHours(0, 0, 0, 0)
                setCalendarWeekStart(monday)
              }}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => setCalendarWeekStart(d => { const n = addDays(d, 7); n.setHours(0,0,0,0); return n })}
              className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary transition-colors"
            >
              Siguiente →
            </button>
            <span className="text-sm text-muted-foreground ml-1">
              {format(calendarWeekStart, "d MMM", { locale: es })} – {format(calendarDays[6], "d MMM yyyy", { locale: es })}
            </span>
            {/* Date picker to jump to any week */}
            <div className="ml-auto relative">
              <input
                type="date"
                title="Ir a semana"
                className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                onChange={(e) => {
                  if (!e.target.value) return
                  const picked = new Date(e.target.value + 'T00:00:00')
                  const dow = picked.getDay()
                  const monday = addDays(picked, dow === 0 ? -6 : 1 - dow)
                  monday.setHours(0, 0, 0, 0)
                  setCalendarWeekStart(monday)
                }}
              />
            </div>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <div className="grid grid-cols-7 min-w-[700px]">
              {/* Day headers */}
              {calendarDays.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const isToday = dateStr === todayStr
                return (
                  <div
                    key={i}
                    className={`px-2 py-2.5 border-b border-border text-center ${i > 0 ? 'border-l' : ''} ${isToday ? 'bg-[#F4EF71]/25' : ''}`}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide capitalize">
                      {format(day, 'EEE', { locale: es })}
                    </p>
                    <p className={`text-xl font-bold mt-0.5 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                )
              })}

              {/* Session cells */}
              {calendarDays.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const isToday = dateStr === todayStr
                const isPast = dateStr < todayStr
                const daySessions = [...sessions, ...events]
                  .filter(s => s.date === dateStr)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))

                return (
                  <div
                    key={i}
                    className={`p-1.5 min-h-[140px] align-top ${i > 0 ? 'border-l border-border' : ''} ${isToday ? 'bg-[#F4EF71]/10' : isPast ? 'bg-secondary/30' : ''}`}
                  >
                    {daySessions.map((session) => {
                      const color = getTypeColor(session.class_type)
                      const isCancelled = session.status === 'cancelled'
                      const isFull = session.spots_booked >= session.capacity && !isCancelled

                      return (
                        <button
                          key={session.id}
                          onClick={() => !isCancelled && openAttendance(session)}
                          title={`${getTypeLabel(session.class_type)} · ${session.start_time.slice(0, 5)} · ${(session.instructor as any)?.name || ''}`}
                          className={`w-full text-left rounded-md p-1.5 mb-1 border text-xs transition-all ${
                            isCancelled
                              ? 'opacity-40 cursor-default line-through'
                              : 'cursor-pointer hover:shadow-md hover:scale-[1.02]'
                          }`}
                          style={{
                            background: hexToRgba(color, 0.15),
                            borderColor: hexToRgba(color, 0.5),
                            borderLeft: `3px solid ${hexToRgba(color, 0.9)}`,
                          }}
                        >
                          <p className="font-bold text-primary leading-tight">{session.start_time.slice(0, 5)}</p>
                          <p className="text-primary/70 truncate leading-tight mt-0.5">{getTypeLabel(session.class_type)}</p>
                          {(session.instructor as any)?.name && (
                            <p className="text-primary/50 truncate leading-tight">{(session.instructor as any).name.split(' ')[0]}</p>
                          )}
                          <p className={`font-semibold leading-tight mt-0.5 ${isFull ? 'text-red-500' : 'text-primary/60'}`}>
                            {session.spots_booked}/{session.capacity}
                          </p>
                          {(waitlistCounts[session.id] ?? 0) > 0 && !isCancelled && (
                            <p className="text-amber-600 font-semibold leading-tight">⏳ {waitlistCounts[session.id]}</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL RESULT MODAL ─────────────────────────────────── */}
      {cancelResult !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div>
                <h2 className="font-semibold text-primary">Clase cancelada</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cancelResult.registrants.length} persona{cancelResult.registrants.length !== 1 ? 's' : ''} registrada{cancelResult.registrants.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setCancelResult(null)} className="text-muted-foreground hover:text-primary p-1">
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Editable WhatsApp message */}
              <div>
                <label className="text-xs font-medium text-primary block mb-1">Mensaje de WhatsApp</label>
                <textarea
                  value={whatsappMsg}
                  onChange={(e) => setWhatsappMsg(e.target.value)}
                  rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">Se enviará este mensaje al hacer clic en el ícono de WhatsApp de cada persona.</p>
              </div>

              {/* Registrant list */}
              <div className="space-y-2">
                {cancelResult.registrants.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-secondary/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.refundType === 'package' && 'Sesión devuelta a la membresía'}
                        {r.refundType === 'credit' && 'Crédito de clase otorgado'}
                        {r.refundType === 'none' && 'Sin reembolso (pago pendiente)'}
                        {r.refundType === 'guest' && 'Invitado — no recibe crédito'}
                      </p>
                    </div>
                    {!r.isGuest && r.phone ? (
                      <a
                        href={buildWhatsappUrl(r.phone, r.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar WhatsApp"
                        className="w-9 h-9 rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors shrink-0"
                      >
                        <FontAwesomeIcon icon={faWhatsapp} className="w-5 h-5" />
                      </a>
                    ) : !r.isGuest ? (
                      <span className="text-xs text-muted-foreground shrink-0">Sin tel.</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-border shrink-0">
              <button
                onClick={() => setCancelResult(null)}
                className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSession !== null && (
        <SessionFormModal
          session={editingSession === 'new' ? null : editingSession}
          instructors={instructors}
          classTypes={classTypes}
          locale={locale}
          defaultSpecial={tab === 'events'}
          onClose={() => setEditingSession(null)}
          onSaved={() => { setEditingSession(null); window.location.reload() }}
        />
      )}
    </div>
  )
}
