'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
import { ClassType } from '@/types'

interface PrevMonthUser { id: string; full_name: string | null; email: string }

interface Props {
  bookings: any[]
  cancelledCount: number
  allPackageSales: any[]
  sessions: any[]
  waitlistBookings: any[]
  prevMonthUsers: PrevMonthUser[]
  prevMonthRevenue: number
  prevMonthBookingCount: number
  newClientsCount: number
  month: number
  year: number
  locale: string
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_LABELS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const DAY_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }

function heatColor(count: number, max: number): { bg: string; text: string } {
  if (count === 0) return { bg: '#f5f4f2', text: '#c0bdb8' }
  const ratio = count / Math.max(max, 1)
  if (ratio < 0.33) return { bg: '#fefce5', text: '#1E1E1E' }
  if (ratio < 0.66) return { bg: '#F4EF71', text: '#1E1E1E' }
  return { bg: '#d4c800', text: '#1E1E1E' }
}

export default function MetricsDashboard({
  bookings,
  cancelledCount,
  allPackageSales,
  sessions,
  waitlistBookings,
  prevMonthUsers,
  prevMonthRevenue,
  prevMonthBookingCount,
  newClientsCount,
  month,
  year,
  locale,
}: Props) {
  const router = useRouter()
  const [retentionOpen, setRetentionOpen] = useState<'returning' | 'onlyThisMonth' | 'atRisk' | null>(null)
  const [revenueOpen, setRevenueOpen] = useState(false)

  // ── KPI computations ───────────────────────────────────────────────────────

  const bookingCount = bookings.length
  const bookingDelta = bookingCount - prevMonthBookingCount

  const totalRevenue = allPackageSales.reduce((sum: number, s: any) => sum + (s.package?.price_mxn || 0), 0)
  const revenueDelta = totalRevenue - prevMonthRevenue

  // Revenue breakdown by payment method
  const revenueByMethod = allPackageSales.reduce<Record<string, number>>((acc, s) => {
    const price = s.package?.price_mxn || 0
    const method = s.stripe_payment_intent_id ? 'stripe'
      : s.payment_method === 'cash' ? 'cash'
      : s.payment_method === 'transfer' ? 'transfer'
      : 'otro'
    acc[method] = (acc[method] || 0) + price
    return acc
  }, {})
  const methodLabels: Record<string, string> = { stripe: '💳 Stripe', cash: '💵 Efectivo', transfer: '🏦 Transferencia', otro: '📦 Otro' }
  const revenueBreakdown = Object.entries(revenueByMethod)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)

  const cancelRate = bookingCount + cancelledCount > 0
    ? Math.round((cancelledCount / (bookingCount + cancelledCount)) * 100)
    : null

  const activeSessions = sessions.filter((s: any) => s.status !== 'cancelled')
  const avgOcupacion = (() => {
    const valid = activeSessions.filter((s: any) => s.capacity > 0)
    if (valid.length === 0) return null
    return Math.round(valid.reduce((sum: number, s: any) => sum + (s.spots_booked / s.capacity) * 100, 0) / valid.length)
  })()

  const today = new Date().toISOString().split('T')[0]
  const attendanceBookings = bookings.filter((b: any) => b.session?.date && b.session.date < today && b.attended !== null)
  const attendanceRate = attendanceBookings.length === 0 ? null
    : Math.round((attendanceBookings.filter((b: any) => b.attended === true).length / attendanceBookings.length) * 100)

  // ── Retention ──────────────────────────────────────────────────────────────

  const prevSet = new Set(prevMonthUsers.map(u => u.id))
  const prevUserMap = new Map(prevMonthUsers.map(u => [u.id, u]))

  // Build this-month unique users with names (deduplicated)
  const thisMonthUserMap = new Map<string, { name: string; email: string }>()
  for (const b of bookings) {
    if (b.user_id && !thisMonthUserMap.has(b.user_id)) {
      thisMonthUserMap.set(b.user_id, {
        name: b.profile?.full_name || b.profile?.email || 'Sin nombre',
        email: b.profile?.email || '',
      })
    }
  }
  const thisMonthUserIds = new Set(thisMonthUserMap.keys())

  const returningIds = [...thisMonthUserIds].filter(id => prevSet.has(id))
  const onlyThisMonthIds = [...thisMonthUserIds].filter(id => !prevSet.has(id))
  const atRiskIds = [...prevSet].filter(id => !thisMonthUserIds.has(id))

  const returning = returningIds.length
  const onlyThisMonth = onlyThisMonthIds.length
  const atRisk = atRiskIds.length

  const drilldownData: Record<string, { name: string; email: string }[]> = {
    returning: returningIds.map(id => thisMonthUserMap.get(id)!),
    onlyThisMonth: onlyThisMonthIds.map(id => thisMonthUserMap.get(id)!),
    atRisk: atRiskIds.map(id => {
      const u = prevUserMap.get(id)
      return { name: u?.full_name || u?.email || 'Sin nombre', email: u?.email || '' }
    }),
  }

  // ── Bar chart data ─────────────────────────────────────────────────────────

  const byHour = bookings.reduce<Record<string, number>>((acc, b) => {
    const hour = b.session?.start_time?.slice(0, 2) || '00'
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {})
  const hourData = Object.entries(byHour).sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))

  const byDow = Array(7).fill(0) as number[]
  for (const b of bookings) {
    if (b.session?.date) byDow[DAY_INDEX[new Date(b.session.date + 'T12:00:00').getDay()]] += 1
  }
  const dowData = DAY_LABELS.map((label, i) => ({ day: label, count: byDow[i] }))

  // ── Heatmap (day × hour) ───────────────────────────────────────────────────

  const heatmapData: Record<number, Record<string, number>> = {}
  const heatHours = new Set<string>()
  for (const b of bookings) {
    if (!b.session?.date || !b.session?.start_time) continue
    const hour = b.session.start_time.slice(0, 2)
    const dow = DAY_INDEX[new Date(b.session.date + 'T12:00:00').getDay()]
    heatHours.add(hour)
    if (!heatmapData[dow]) heatmapData[dow] = {}
    heatmapData[dow][hour] = (heatmapData[dow][hour] || 0) + 1
  }
  const sortedHours = Array.from(heatHours).sort()
  const heatMax = Math.max(1, ...Object.values(heatmapData).flatMap(row => Object.values(row)))

  // ── Class type table ───────────────────────────────────────────────────────

  const classTypeMap: Record<string, { reservas: number; sesiones: number; cancelledSesiones: number; totalBooked: number; totalCap: number; waitlist: number }> = {}

  for (const s of sessions) {
    const t = s.class_type
    if (!classTypeMap[t]) classTypeMap[t] = { reservas: 0, sesiones: 0, cancelledSesiones: 0, totalBooked: 0, totalCap: 0, waitlist: 0 }
    if (s.status === 'cancelled') {
      classTypeMap[t].cancelledSesiones += 1
    } else {
      classTypeMap[t].sesiones += 1
      classTypeMap[t].totalBooked += s.spots_booked || 0
      classTypeMap[t].totalCap += s.capacity || 0
    }
  }
  for (const b of bookings) {
    const t = b.session?.class_type
    if (t) {
      if (!classTypeMap[t]) classTypeMap[t] = { reservas: 0, sesiones: 0, cancelledSesiones: 0, totalBooked: 0, totalCap: 0, waitlist: 0 }
      classTypeMap[t].reservas += 1
    }
  }
  // Waitlist: filter to sessions in this month's range
  const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEndStr = new Date(year, month, 0).toISOString().split('T')[0]
  for (const w of waitlistBookings) {
    const t = (w as any).session?.class_type
    const d = (w as any).session?.date
    if (t && d && d >= monthStartStr && d <= monthEndStr) {
      if (!classTypeMap[t]) classTypeMap[t] = { reservas: 0, sesiones: 0, cancelledSesiones: 0, totalBooked: 0, totalCap: 0, waitlist: 0 }
      classTypeMap[t].waitlist += 1
    }
  }
  const classTypeRows = Object.entries(classTypeMap)
    .map(([type, d]) => ({
      type,
      label: CLASS_TYPE_LABELS[type as ClassType]?.es || type,
      reservas: d.reservas,
      sesiones: d.sesiones,
      cancelledSesiones: d.cancelledSesiones,
      ocupacion: d.totalCap > 0 ? Math.round((d.totalBooked / d.totalCap) * 100) : null,
      waitlist: d.waitlist,
    }))
    .sort((a, b) => b.reservas - a.reservas)

  // ── Instructor table ───────────────────────────────────────────────────────

  const instructorMap: Record<string, { name: string; sesiones: number; totalBooked: number; totalCap: number }> = {}
  for (const s of activeSessions) {
    const name = (s.instructor as any)?.name
    if (!name) continue
    if (!instructorMap[name]) instructorMap[name] = { name, sesiones: 0, totalBooked: 0, totalCap: 0 }
    instructorMap[name].sesiones += 1
    instructorMap[name].totalBooked += s.spots_booked || 0
    instructorMap[name].totalCap += s.capacity || 0
  }
  const instructorRows = Object.values(instructorMap)
    .map(d => ({ ...d, ocupacion: d.totalCap > 0 ? Math.round((d.totalBooked / d.totalCap) * 100) : null }))
    .sort((a, b) => b.totalBooked - a.totalBooked)

  // ── Top 5 clients ──────────────────────────────────────────────────────────

  const clientMap: Record<string, { name: string; count: number; typeCount: Record<string, number> }> = {}
  for (const b of bookings) {
    if (!b.user_id) continue
    const name = b.profile?.full_name || b.profile?.email || 'Sin nombre'
    if (!clientMap[b.user_id]) clientMap[b.user_id] = { name, count: 0, typeCount: {} }
    clientMap[b.user_id].count += 1
    const t = b.session?.class_type || 'unknown'
    clientMap[b.user_id].typeCount[t] = (clientMap[b.user_id].typeCount[t] || 0) + 1
  }
  const top5 = Object.values(clientMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(d => {
      const topType = Object.entries(d.typeCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown'
      return { name: d.name, count: d.count, topType }
    })

  // ── Navigation ─────────────────────────────────────────────────────────────

  function navigate(m: number, y: number) {
    router.push(`/${locale}/admin/metrics?month=${m}&year=${y}`)
  }
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  // ── Delta helper ───────────────────────────────────────────────────────────

  function Delta({ delta, prevValue, isCurrency = false }: { delta: number; prevValue: number; isCurrency?: boolean }) {
    if (prevValue === 0) return null
    if (delta === 0) return <span className="text-xs text-muted-foreground mt-1">igual que el mes anterior</span>
    const positive = delta > 0
    const abs = Math.abs(delta)
    const formatted = isCurrency ? `$${abs.toLocaleString('es-MX')}` : abs.toLocaleString('es-MX')
    return (
      <span className={`text-xs mt-1 ${positive ? 'text-green-600' : 'text-red-500'}`}>
        {positive ? '+' : '-'}{formatted} {positive ? 'más' : 'menos'} que el mes anterior
      </span>
    )
  }

  // ── Ocupación bar helper ───────────────────────────────────────────────────

  function OcupBar({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-muted-foreground text-xs">—</span>
    const color = pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-[#F4EF71]' : 'bg-red-300'
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-secondary rounded-full h-1.5 max-w-[64px]">
          <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <span className="text-xs font-medium text-primary w-8 text-right">{pct}%</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Métricas</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(prevMonth, prevYear)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">←</button>
          <span className="text-sm font-medium text-primary min-w-[150px] text-center capitalize">
            {MONTHS_ES[month - 1]} {year}
          </span>
          <button onClick={() => navigate(nextMonth, nextYear)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">→</button>
        </div>
      </div>

      {/* ── Row 1: 6 KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <span className="text-xs text-muted-foreground mb-2">Reservas</span>
          <p className="text-2xl font-bold text-primary">{bookingCount}</p>
          <Delta delta={bookingDelta} prevValue={prevMonthBookingCount} />
        </div>

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <span className="text-xs text-muted-foreground mb-2">Ingresos totales</span>
          <p className="text-2xl font-bold text-primary">${totalRevenue.toLocaleString('es-MX')}</p>
          <Delta delta={revenueDelta} prevValue={prevMonthRevenue} isCurrency />
          {revenueBreakdown.length > 0 && (
            <button
              onClick={() => setRevenueOpen(o => !o)}
              className="text-xs text-muted-foreground mt-2 underline underline-offset-2 text-left hover:text-primary transition-colors"
            >
              {revenueOpen ? 'Ocultar desglose' : 'Ver desglose'}
            </button>
          )}
          {revenueOpen && (
            <div className="mt-2 space-y-1 border-t border-border pt-2">
              {revenueBreakdown.map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{methodLabels[method] || method}</span>
                  <span className="text-xs font-semibold text-primary">${amount.toLocaleString('es-MX')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <span className="text-xs text-muted-foreground mb-2">Ocupación promedio</span>
          <p className="text-2xl font-bold text-primary">{avgOcupacion !== null ? `${avgOcupacion}%` : '—'}</p>
          {avgOcupacion === null && <span className="text-xs text-muted-foreground mt-1">sin datos</span>}
        </div>

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <span className="text-xs text-muted-foreground mb-2">Tasa de asistencia</span>
          <p className="text-2xl font-bold text-primary">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</p>
          {attendanceRate === null && <span className="text-xs text-muted-foreground mt-1">sin datos</span>}
        </div>

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <span className="text-xs text-muted-foreground mb-2">Clientas nuevas</span>
          <p className="text-2xl font-bold text-primary">{newClientsCount}</p>
          <span className="text-xs text-muted-foreground mt-1">registradas este mes</span>
        </div>

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <span className="text-xs text-muted-foreground mb-2">Tasa de cancelación</span>
          <p className="text-2xl font-bold text-primary">{cancelRate !== null ? `${cancelRate}%` : '—'}</p>
          {cancelledCount > 0 && <span className="text-xs text-muted-foreground mt-1">{cancelledCount} canceladas</span>}
        </div>
      </div>

      {/* ── Row 2: Retention (70%) + Top 5 (30%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6 mb-8">

        {/* Retention */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-primary mb-4">Retención de clientas</h2>
          <div className="grid grid-cols-3 gap-4">
            {(
              [
                { key: 'returning' as const, value: returning, label: 'Regresaron\nvs. mes anterior', color: 'text-green-600', border: false },
                { key: 'onlyThisMonth' as const, value: onlyThisMonth, label: 'Solo este mes\n(nuevas o de regreso)', color: 'text-primary', border: true },
                { key: 'atRisk' as const, value: atRisk, label: 'En riesgo\n(no reservaron este mes)', color: 'text-orange-500', border: false },
              ]
            ).map(({ key, value, label, color, border }) => (
              <div key={key} className={`text-center ${border ? 'border-x border-border' : ''}`}>
                <button
                  onClick={() => setRetentionOpen(prev => prev === key ? null : key)}
                  className={`text-3xl font-bold ${color} hover:opacity-70 transition-opacity focus:outline-none`}
                  title="Ver detalle"
                >
                  {value}
                </button>
                <p className="text-xs text-muted-foreground mt-1 leading-tight whitespace-pre-line">{label}</p>
              </div>
            ))}
          </div>
          {prevMonthUsers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4">No hay datos del mes anterior para comparar</p>
          )}
          {retentionOpen && drilldownData[retentionOpen].length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {retentionOpen === 'returning' && 'Clientas que regresaron'}
                {retentionOpen === 'onlyThisMonth' && 'Clientas solo este mes'}
                {retentionOpen === 'atRisk' && 'Clientas en riesgo'}
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {drilldownData[retentionOpen].map((u, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-primary font-medium truncate">{u.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{u.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {retentionOpen && drilldownData[retentionOpen].length === 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground text-center">Sin clientas en esta categoría</p>
            </div>
          )}
        </div>

        {/* Top 5 clients */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-primary mb-4">Top 5 clientas</h2>
          {top5.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {top5.map((client, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3 w-5 text-muted-foreground font-medium text-xs">{i + 1}</td>
                    <td className="py-2.5">
                      <p className="font-semibold text-primary leading-tight text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CLASS_TYPE_LABELS[client.topType as ClassType]?.es || client.topType}
                      </p>
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <span className="inline-block bg-[#F4EF71] text-primary text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        {client.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">Sin datos este mes</p>
          )}
        </div>

      </div>

      {/* ── Row 3: Class type table ── */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm mb-8">
        <h2 className="text-sm font-semibold text-primary mb-4">Rendimiento por tipo de clase</h2>
        {classTypeRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-4">Tipo</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground pb-2 px-3">Reservas</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground pb-2 px-3">Clases</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground pb-2 px-3">Canceladas</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground pb-2 px-3">Ocupación</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground pb-2 pl-3">Lista espera</th>
                </tr>
              </thead>
              <tbody>
                {classTypeRows.map((row, i) => (
                  <tr key={row.type} className={`${i > 0 ? 'border-t border-border' : ''}`}>
                    <td className="py-2.5 pr-4">
                      <span className="font-medium text-primary">{row.label}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-primary">{row.reservas}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{row.sesiones}</td>
                    <td className="py-2.5 px-3 text-right">
                      {row.cancelledSesiones > 0
                        ? <span className="text-red-500 font-medium">{row.cancelledSesiones}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="py-2.5 px-3"><OcupBar pct={row.ocupacion} /></td>
                    <td className="py-2.5 pl-3 text-right">
                      {row.waitlist > 0
                        ? <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">{row.waitlist}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">Sin datos este mes</p>
        )}
      </div>

      {/* ── Row 4: Instructor table (50%) + Heatmap (50%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Instructor table */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-primary mb-4">Rendimiento por instructora</h2>
          {instructorRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-4">Instructora</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground pb-2 px-3">Clases</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground pb-2 px-3">Reservas</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-2 pl-3">Ocupación</th>
                  </tr>
                </thead>
                <tbody>
                  {instructorRows.map((row, i) => (
                    <tr key={row.name} className={`${i > 0 ? 'border-t border-border' : ''}`}>
                      <td className="py-2.5 pr-4 font-medium text-primary">{row.name}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{row.sesiones}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-primary">{row.totalBooked}</td>
                      <td className="py-2.5 pl-3"><OcupBar pct={row.ocupacion} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">Sin datos este mes</p>
          )}
        </div>

        {/* Heatmap */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-primary mb-1">Mapa de calor</h2>
          <p className="text-xs text-muted-foreground mb-4">Reservas por día y horario</p>
          {sortedHours.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs" style={{ minWidth: `${sortedHours.length * 56 + 48}px` }}>
                <thead>
                  <tr>
                    <th className="w-10 pb-2" />
                    {sortedHours.map(h => (
                      <th key={h} className="pb-2 px-1 text-muted-foreground font-medium text-center w-14">
                        {h}:00
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAY_LABELS.map((day, dayIdx) => (
                    <tr key={day}>
                      <td className="pr-2 py-1 font-medium text-muted-foreground text-right w-10">{day}</td>
                      {sortedHours.map(h => {
                        const count = heatmapData[dayIdx]?.[h] || 0
                        const { bg, text } = heatColor(count, heatMax)
                        return (
                          <td key={h} className="px-1 py-1">
                            <div
                              className="w-12 h-9 rounded-md flex items-center justify-center font-semibold transition-colors"
                              style={{ backgroundColor: bg, color: text }}
                            >
                              {count > 0 ? count : ''}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground">Menos</span>
                {[{ bg: '#fefce5' }, { bg: '#F4EF71' }, { bg: '#d4c800' }].map((c, i) => (
                  <div key={i} className="w-6 h-4 rounded" style={{ backgroundColor: c.bg }} />
                ))}
                <span className="text-xs text-muted-foreground">Más</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">Sin datos este mes</p>
          )}
        </div>

      </div>

      {/* ── Row 5: Bar charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-primary mb-4">Reservas por horario</h2>
          {hourData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourData}>
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1E1E1E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">Sin datos</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-primary mb-4">Reservas por día de semana</h2>
          {bookings.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dowData}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#F4EF71" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">Sin datos</p>
          )}
        </div>
      </div>
    </div>
  )
}
