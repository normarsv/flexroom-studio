'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { ClassTypeConfig, Instructor, InstructorRateOverride } from '@/types'
import { toast } from 'sonner'

interface Props {
  instructors: Instructor[]
  classTypes: ClassTypeConfig[]
  initialOverrides: InstructorRateOverride[]
}

interface PayrollSession {
  id: string
  date: string
  start_time: string
  class_type: string
  capacity: number
  spots_booked: number
  status: string
  instructor_paid_at: string | null
  instructor_payment_notes: string | null
  is_special: boolean
  event_title: string | null
  custom_title: string | null
}

export default function AdminPayroll({ instructors, classTypes, initialOverrides }: Props) {
  const [tab, setTab] = useState<'payroll' | 'rates'>('payroll')

  // ── RATES TAB ──────────────────────────────────────────────
  const [globalRates, setGlobalRates] = useState<ClassTypeConfig[]>(classTypes)
  const [savingGlobal, setSavingGlobal] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<InstructorRateOverride[]>(initialOverrides)
  const [overrideInstructorId, setOverrideInstructorId] = useState(instructors[0]?.id || '')
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({})
  const [savingOverride, setSavingOverride] = useState<string | null>(null)

  async function handleSaveGlobalRate(ct: ClassTypeConfig, level: 'junior' | 'senior', rate: number) {
    const key = `${ct.id}:${level}`
    setSavingGlobal(key)
    const res = await fetch('/api/admin/payroll/rates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'global', class_type_id: ct.id, level, rate }),
    })
    if (res.ok) {
      const field = level === 'senior' ? 'instructor_rate_senior_mxn' : 'instructor_rate_junior_mxn'
      setGlobalRates(prev => prev.map(r => r.id === ct.id ? { ...r, [field]: rate } : r))
      toast.success('Tarifa actualizada')
    } else {
      toast.error('Error al guardar')
    }
    setSavingGlobal(null)
  }

  async function handleSaveOverride(classType: string, rateStr: string) {
    const key = `${overrideInstructorId}:${classType}`
    setSavingOverride(key)
    const rate = rateStr.trim() === '' ? null : Number(rateStr)
    const res = await fetch('/api/admin/payroll/rates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'override', instructor_id: overrideInstructorId, class_type: classType, rate }),
    })
    if (res.ok) {
      if (rate === null) {
        setOverrides(prev => prev.filter(o => !(o.instructor_id === overrideInstructorId && o.class_type === classType)))
        toast.success('Tarifa restablecida a tarifa por nivel')
      } else {
        setOverrides(prev => {
          const exists = prev.find(o => o.instructor_id === overrideInstructorId && o.class_type === classType)
          if (exists) return prev.map(o => o.instructor_id === overrideInstructorId && o.class_type === classType ? { ...o, rate_mxn: rate } : o)
          return [...prev, { id: key, instructor_id: overrideInstructorId, class_type: classType, rate_mxn: rate, created_at: new Date().toISOString() }]
        })
        toast.success('Tarifa personalizada guardada')
      }
      setLocalOverrides(prev => { const next = { ...prev }; delete next[key]; return next })
    } else {
      toast.error('Error al guardar')
    }
    setSavingOverride(null)
  }

  // ── PAYROLL TAB ────────────────────────────────────────────
  const [instructorId, setInstructorId] = useState('')
  const [periodMode, setPeriodMode] = useState<'week' | 'custom'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [sessions, setSessions] = useState<PayrollSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bonus, setBonus] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [markingPaid, setMarkingPaid] = useState(false)

  function getWeekRange(offset: number) {
    const today = new Date()
    const dow = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow) + offset * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      from: format(monday, 'yyyy-MM-dd'),
      to: format(sunday, 'yyyy-MM-dd'),
      label: `${format(monday, "d 'de' MMM", { locale: es })} – ${format(sunday, "d 'de' MMM yyyy", { locale: es })}`,
    }
  }

  function getRate(classType: string, iId: string): number {
    const override = overrides.find(o => o.instructor_id === iId && o.class_type === classType)
    if (override) return override.rate_mxn
    const instructor = instructors.find(i => i.id === iId)
    const ct = globalRates.find(r => r.key === classType)
    if (!ct) return 0
    return instructor?.level === 'senior' ? ct.instructor_rate_senior_mxn : ct.instructor_rate_junior_mxn
  }

  function getTypeName(classType: string): string {
    return globalRates.find(r => r.key === classType)?.name_es || classType
  }

  async function loadSessions() {
    if (!instructorId) { toast.error('Selecciona un coach'); return }
    let from: string, to: string
    if (periodMode === 'week') {
      const range = getWeekRange(weekOffset)
      from = range.from; to = range.to
    } else {
      if (!customFrom || !customTo) { toast.error('Selecciona un rango de fechas'); return }
      from = customFrom; to = customTo
    }
    setLoadingSessions(true)
    setLoaded(false)
    setSessions([])
    const res = await fetch(`/api/admin/payroll/sessions?instructor_id=${instructorId}&from=${from}&to=${to}`)
    if (res.ok) {
      const data: PayrollSession[] = await res.json()
      setSessions(data)
      setSelectedIds(new Set(data.filter(s => !s.instructor_paid_at).map(s => s.id)))
      setLoaded(true)
    } else {
      toast.error('Error al cargar clases')
    }
    setLoadingSessions(false)
  }

  function toggleSession(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(unpaidIds: string[]) {
    const allSelected = unpaidIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(prev => { const next = new Set(prev); unpaidIds.forEach(id => next.delete(id)); return next })
    } else {
      setSelectedIds(prev => { const next = new Set(prev); unpaidIds.forEach(id => next.add(id)); return next })
    }
  }

  const unpaidSessions = sessions.filter(s => !s.instructor_paid_at)
  const paidSessions = sessions.filter(s => s.instructor_paid_at)
  const subtotal = Array.from(selectedIds).reduce((sum, id) => {
    const s = sessions.find(x => x.id === id)
    return sum + (s ? getRate(s.class_type, instructorId) : 0)
  }, 0)
  const bonusNum = Number(bonus) || 0
  const total = subtotal + bonusNum

  async function handleMarkPaid() {
    if (selectedIds.size === 0) { toast.error('Selecciona al menos una clase'); return }
    if (!confirm(`¿Marcar ${selectedIds.size} clase(s) como pagadas? Total: $${total.toLocaleString('es-MX')} MXN`)) return
    setMarkingPaid(true)
    const res = await fetch('/api/admin/payroll/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_ids: Array.from(selectedIds), notes: paymentNotes.trim() || undefined }),
    })
    if (res.ok) {
      const now = new Date().toISOString()
      setSessions(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, instructor_paid_at: now, instructor_payment_notes: paymentNotes.trim() || null } : s))
      setSelectedIds(new Set())
      setBonus('')
      setPaymentNotes('')
      toast.success(`${selectedIds.size} clase(s) marcadas como pagadas`)
    } else {
      toast.error('Error al marcar como pagadas')
    }
    setMarkingPaid(false)
  }

  const weekRange = getWeekRange(weekOffset)

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Nómina</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6 w-fit overflow-x-auto">
        {([
          { key: 'payroll', label: 'Pago de clases' },
          { key: 'rates', label: 'Tarifas' },
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

      {/* ── RATES TAB ──────────────────────────────────────── */}
      {tab === 'rates' && (
        <div className="space-y-6">
          {/* Global rates */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-primary mb-1">Tarifas globales por tipo de clase</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Lo que se paga al coach por dar una clase de este tipo según su nivel. Se aplica salvo que tengan una tarifa personalizada.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-2 font-medium text-muted-foreground pr-4">Tipo de clase</th>
                    <th className="pb-2 font-medium text-muted-foreground pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-secondary border border-border inline-block" />
                        Junior
                      </span>
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                        Senior
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {globalRates.filter(ct => ct.is_active).map((ct) => (
                    <tr key={ct.id} className="border-b border-border last:border-0">
                      <td className="py-3 font-medium text-primary pr-4">{ct.name_es}</td>
                      {(['junior', 'senior'] as const).map((level) => {
                        const field = level === 'senior' ? 'instructor_rate_senior_mxn' : 'instructor_rate_junior_mxn'
                        const currentVal = ct[field]
                        const saveKey = `${ct.id}:${level}`
                        return (
                          <td key={level} className="py-3 pr-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">$</span>
                              <input
                                type="number"
                                min={0}
                                defaultValue={currentVal}
                                key={`${saveKey}-${currentVal}`}
                                onBlur={(e) => {
                                  const val = Number(e.target.value)
                                  if (val !== currentVal) handleSaveGlobalRate(ct, level, val)
                                }}
                                className="w-24 px-3 py-1.5 rounded-lg border border-border text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              {savingGlobal === saveKey && <span className="text-xs text-muted-foreground">...</span>}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Las tarifas se guardan automáticamente al salir del campo.</p>
          </div>

          {/* Per-instructor overrides */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-primary mb-1">Tarifas personalizadas por coach</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Sobreescribe la tarifa global para un coach específico. Deja en blanco para usar la tarifa global.
            </p>
            <div className="mb-5">
              <label className="text-xs font-medium text-primary block mb-1">Coach</label>
              <select
                value={overrideInstructorId}
                onChange={(e) => setOverrideInstructorId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {instructors.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            {overrideInstructorId && (
              <div className="space-y-3">
                {globalRates.filter(ct => ct.is_active).map((ct) => {
                  const key = `${overrideInstructorId}:${ct.key}`
                  const currentOverride = overrides.find(o => o.instructor_id === overrideInstructorId && o.class_type === ct.key)
                  const localVal = key in localOverrides ? localOverrides[key] : (currentOverride ? String(currentOverride.rate_mxn) : '')
                  const hasOverride = !!currentOverride

                  return (
                    <div key={ct.key} className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-primary w-48 shrink-0">
                        {ct.name_es}
                        {hasOverride && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">Custom</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          min={0}
                          placeholder={String(
                            instructors.find(i => i.id === overrideInstructorId)?.level === 'senior'
                              ? ct.instructor_rate_senior_mxn
                              : ct.instructor_rate_junior_mxn
                          )}
                          value={localVal}
                          onChange={(e) => setLocalOverrides(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-24 px-3 py-1.5 rounded-lg border border-border text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <span className="text-sm text-muted-foreground">MXN</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingOverride === key || !(key in localOverrides)}
                          onClick={() => handleSaveOverride(ct.key, localVal)}
                          className="text-xs"
                        >
                          {savingOverride === key ? 'Guardando...' : 'Guardar'}
                        </Button>
                        {hasOverride && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={savingOverride === key}
                            onClick={() => handleSaveOverride(ct.key, '')}
                            className="text-xs text-destructive hover:text-destructive"
                          >
                            Restablecer
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PAYROLL TAB ────────────────────────────────────── */}
      {tab === 'payroll' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-primary">Seleccionar período</h2>

            {/* Instructor */}
            <div>
              <label className="text-xs font-medium text-primary block mb-1">Coach</label>
              <select
                value={instructorId}
                onChange={(e) => { setInstructorId(e.target.value); setLoaded(false); setSessions([]) }}
                className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— Selecciona un coach —</option>
                {instructors.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            {/* Period mode toggle */}
            <div>
              <label className="text-xs font-medium text-primary block mb-2">Período</label>
              <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
                {([
                  { key: 'week', label: 'Por semana' },
                  { key: 'custom', label: 'Rango personalizado' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPeriodMode(key)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      periodMode === key ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Week selector */}
            {periodMode === 'week' && (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => { setWeekOffset(w => w - 1); setLoaded(false) }}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => { setWeekOffset(0); setLoaded(false) }}
                  className="px-3 py-1.5 rounded-lg border border-primary/40 text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
                >
                  Esta semana
                </button>
                <button
                  onClick={() => { setWeekOffset(w => w + 1); setLoaded(false) }}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary transition-colors"
                >
                  Siguiente →
                </button>
                <span className="text-sm font-medium text-primary">{weekRange.label}</span>
              </div>
            )}

            {/* Custom range */}
            {periodMode === 'custom' && (
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Desde</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => { setCustomFrom(e.target.value); setLoaded(false) }}
                    className="px-3 py-1.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-primary block mb-1">Hasta</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => { setCustomTo(e.target.value); setLoaded(false) }}
                    className="px-3 py-1.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            )}

            <Button
              onClick={loadSessions}
              disabled={loadingSessions || !instructorId}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loadingSessions ? 'Cargando...' : 'Cargar clases'}
            </Button>
          </div>

          {/* Sessions list */}
          {loaded && (
            <>
              {sessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-border shadow-sm p-10 text-center text-muted-foreground text-sm">
                  No hay clases en este período para este coach.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                  {/* Unpaid sessions */}
                  {unpaidSessions.length > 0 && (
                    <>
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <h3 className="font-semibold text-primary text-sm">Clases por pagar ({unpaidSessions.length})</h3>
                        <button
                          onClick={() => toggleAll(unpaidSessions.map(s => s.id))}
                          className="text-xs text-primary underline underline-offset-2 hover:opacity-70"
                        >
                          {unpaidSessions.every(s => selectedIds.has(s.id)) ? 'Deseleccionar todas' : 'Seleccionar todas'}
                        </button>
                      </div>
                      {unpaidSessions.map((session, idx) => {
                        const rate = getRate(session.class_type, instructorId)
                        const isOverride = overrides.some(o => o.instructor_id === instructorId && o.class_type === session.class_type)
                        const isSelected = selectedIds.has(session.id)
                        return (
                          <div
                            key={session.id}
                            onClick={() => toggleSession(session.id)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${idx > 0 ? 'border-t border-border' : ''} ${isSelected ? 'bg-primary/5' : 'hover:bg-secondary/50'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSession(session.id)}
                              onClick={e => e.stopPropagation()}
                              className="w-4 h-4 accent-primary shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-primary">
                                {session.is_special ? (session.event_title || 'Evento') : getTypeName(session.class_type)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(parseISO(session.date), "EEE d MMM", { locale: es })} · {session.start_time.slice(0, 5)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-primary">${rate.toLocaleString('es-MX')} MXN</p>
                              {isOverride
                                ? <p className="text-[10px] text-muted-foreground">tarifa personalizada</p>
                                : <p className="text-[10px] text-muted-foreground">{instructors.find(i => i.id === instructorId)?.level === 'senior' ? 'senior' : 'junior'}</p>
                              }
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {/* Paid sessions */}
                  {paidSessions.length > 0 && (
                    <>
                      <div className={`px-4 py-3 border-b border-border ${unpaidSessions.length > 0 ? 'border-t' : ''}`}>
                        <h3 className="font-semibold text-muted-foreground text-sm">Ya pagadas ({paidSessions.length})</h3>
                      </div>
                      {paidSessions.map((session, idx) => {
                        const rate = getRate(session.class_type, instructorId)
                        return (
                          <div key={session.id} className={`flex items-center gap-3 px-4 py-3 opacity-50 ${idx > 0 ? 'border-t border-border' : ''}`}>
                            <span className="text-green-500 text-sm shrink-0">✓</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-primary line-through">
                                {session.is_special ? (session.event_title || 'Evento') : getTypeName(session.class_type)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(parseISO(session.date), "EEE d MMM", { locale: es })} · {session.start_time.slice(0, 5)}
                                {session.instructor_paid_at && ` · Pagado ${format(parseISO(session.instructor_paid_at), "d MMM", { locale: es })}`}
                              </p>
                              {session.instructor_payment_notes && (
                                <p className="text-xs text-muted-foreground italic mt-0.5">"{session.instructor_payment_notes}"</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-primary">${rate.toLocaleString('es-MX')} MXN</p>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )}

              {/* Summary + mark paid */}
              {unpaidSessions.length > 0 && (
                <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4">
                  <h3 className="font-semibold text-primary">Resumen de pago</h3>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clases seleccionadas</span>
                      <span className="font-medium text-primary">{selectedIds.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium text-primary">${subtotal.toLocaleString('es-MX')} MXN</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bono adicional</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">$</span>
                        <input
                          type="number"
                          min={0}
                          value={bonus}
                          onChange={e => setBonus(e.target.value)}
                          placeholder="0"
                          className="w-24 px-2 py-1 rounded-lg border border-border text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <span className="text-muted-foreground text-xs">MXN</span>
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 mt-2">
                      <span className="font-semibold text-primary">Total a pagar</span>
                      <span className="font-bold text-lg text-primary">${total.toLocaleString('es-MX')} MXN</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-primary block mb-1">Notas (opcional)</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={e => setPaymentNotes(e.target.value)}
                      placeholder="Ej: Transferencia #12345"
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <Button
                    onClick={handleMarkPaid}
                    disabled={markingPaid || selectedIds.size === 0}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
                  >
                    {markingPaid ? 'Guardando...' : `Marcar ${selectedIds.size} clase(s) como pagadas`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
