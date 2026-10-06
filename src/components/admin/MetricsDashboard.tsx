'use client'

import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
import { ClassType } from '@/types'

interface Props {
  bookings: any[]
  requests: any[]
  packageSales: any[]
  sessions: any[]
  prevMonthBookingCount: number
  prevMonthRevenue: number
  month: number
  year: number
  locale: string
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const COLORS = ['#F4EF71', '#868686', '#1E1E1E', '#C8C8C8', '#EEEAE3']
const DAY_LABELS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
// getDay() returns 0=Sun,1=Mon,...,6=Sat → map to index 0=Mon..6=Sun
const DAY_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }

export default function MetricsDashboard({
  bookings,
  requests,
  packageSales,
  sessions,
  prevMonthBookingCount,
  prevMonthRevenue,
  month,
  year,
  locale,
}: Props) {
  const router = useRouter()

  // ── Stat computations ──────────────────────────────────────────────────────

  // Reservas
  const bookingCount = bookings.length
  const bookingDelta = bookingCount - prevMonthBookingCount

  // Ingresos (Stripe only)
  const revenue = packageSales.reduce((sum: number, s: any) => sum + (s.package?.price_mxn || 0), 0)
  const revenueDelta = revenue - prevMonthRevenue

  // Ocupación promedio from sessions this month
  const avgOcupacion = (() => {
    const valid = sessions.filter((s: any) => s.capacity > 0)
    if (valid.length === 0) return null
    const avg = valid.reduce((sum: number, s: any) => sum + (s.spots_booked / s.capacity) * 100, 0) / valid.length
    return Math.round(avg)
  })()

  // Tasa de asistencia — only past sessions, attended !== null
  const today = new Date().toISOString().split('T')[0]
  const attendanceBookings = bookings.filter(
    (b: any) => b.session?.date && b.session.date < today && b.attended !== null
  )
  const attendanceRate = (() => {
    if (attendanceBookings.length === 0) return null
    const attended = attendanceBookings.filter((b: any) => b.attended === true).length
    return Math.round((attended / attendanceBookings.length) * 100)
  })()

  // ── Chart data ─────────────────────────────────────────────────────────────

  // By type (pie)
  const byType = bookings.reduce<Record<string, number>>((acc, b) => {
    const type = b.session?.class_type || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  const typeData = Object.entries(byType).map(([type, count]) => ({
    name: CLASS_TYPE_LABELS[type as ClassType]?.es || type,
    value: count,
  }))

  // By hour (bar)
  const byHour = bookings.reduce<Record<string, number>>((acc, b) => {
    const hour = b.session?.start_time?.slice(0, 2) || '00'
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {})
  const hourData = Object.entries(byHour)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))

  // By day of week (bar)
  const byDow = Array(7).fill(0) as number[]
  for (const b of bookings) {
    if (b.session?.date) {
      const dow = new Date(b.session.date + 'T12:00:00').getDay()
      byDow[DAY_INDEX[dow]] += 1
    }
  }
  const dowData = DAY_LABELS.map((label, i) => ({ day: label, count: byDow[i] }))

  // ── Top 5 clients ──────────────────────────────────────────────────────────
  const clientMap: Record<string, { name: string; count: number; typeCount: Record<string, number> }> = {}
  for (const b of bookings) {
    if (!b.user_id) continue
    const id = b.user_id
    const name = b.profile?.full_name || b.profile?.email || 'Sin nombre'
    if (!clientMap[id]) clientMap[id] = { name, count: 0, typeCount: {} }
    clientMap[id].count += 1
    const type = b.session?.class_type || 'unknown'
    clientMap[id].typeCount[type] = (clientMap[id].typeCount[type] || 0) + 1
  }
  const top5 = Object.entries(clientMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([, data]) => {
      const topType = Object.entries(data.typeCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown'
      return { name: data.name, count: data.count, topType }
    })

  // ── Navigation ─────────────────────────────────────────────────────────────
  function navigate(newMonth: number, newYear: number) {
    router.push(`/${locale}/admin/metrics?month=${newMonth}&year=${newYear}`)
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Métricas</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(prevMonth, prevYear)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
          >←</button>
          <span className="text-sm font-medium text-primary min-w-[140px] text-center">
            {MONTHS_ES[month - 1]} {year}
          </span>
          <button
            onClick={() => navigate(nextMonth, nextYear)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
          >→</button>
        </div>
      </div>

      {/* Row 1: 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Reservas */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <span className="text-xs text-muted-foreground mb-2">Reservas</span>
          <p className="text-2xl font-bold text-primary">{bookingCount}</p>
          <Delta delta={bookingDelta} prevValue={prevMonthBookingCount} isCurrency={false} />
        </div>

        {/* Ingresos */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <span className="text-xs text-muted-foreground mb-2">Ingresos (Stripe)</span>
          <p className="text-2xl font-bold text-primary">${revenue.toLocaleString('es-MX')} MXN</p>
          <Delta delta={revenueDelta} prevValue={prevMonthRevenue} isCurrency={true} />
        </div>

        {/* Ocupación promedio */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <span className="text-xs text-muted-foreground mb-2">Ocupación promedio</span>
          <p className="text-2xl font-bold text-primary">
            {avgOcupacion !== null ? `${avgOcupacion}%` : '—'}
          </p>
          {avgOcupacion === null && (
            <span className="text-xs text-muted-foreground mt-1">sin datos este mes</span>
          )}
        </div>

        {/* Tasa de asistencia */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <span className="text-xs text-muted-foreground mb-2">Tasa de asistencia</span>
          <p className="text-2xl font-bold text-primary">
            {attendanceRate !== null ? `${attendanceRate}%` : '— sin datos'}
          </p>
        </div>
      </div>

      {/* Row 2: two bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Reservas por horario */}
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

        {/* Reservas por día de semana */}
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

      {/* Row 3: top clients + pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top 5 clientes */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-primary mb-4">Top 5 clientes</h2>
          {top5.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {top5.map((client, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 w-6 text-muted-foreground font-medium">{i + 1}</td>
                    <td className="py-2 flex-1">
                      <p className="font-semibold text-primary leading-tight">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CLASS_TYPE_LABELS[client.topType as ClassType]?.es || client.topType}
                      </p>
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <span className="inline-block bg-[#F4EF71] text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                        {client.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">Sin datos este mes.</p>
          )}
        </div>

        {/* Reservas por tipo de clase */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-primary mb-4">Reservas por tipo de clase</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">Sin datos</p>
          )}
        </div>
      </div>
    </div>
  )
}
