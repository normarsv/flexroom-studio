'use client'

import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faCalendarDays, faArrowTrendUp, faComment } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { CLASS_TYPE_LABELS } from '@/lib/constants'
import { ClassType } from '@/types'

interface Props {
  bookings: any[]
  requests: any[]
  packageSales: any[]
  month: number
  year: number
  locale: string
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const COLORS = ['#F4EF71', '#868686', '#1E1E1E', '#C8C8C8', '#EEEAE3']

export default function MetricsDashboard({ bookings, requests, packageSales, month, year, locale }: Props) {
  const router = useRouter()

  // Bookings by class type
  const byType = bookings.reduce<Record<string, number>>((acc, b) => {
    const type = b.session?.class_type || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const typeData = Object.entries(byType).map(([type, count]) => ({
    name: CLASS_TYPE_LABELS[type as ClassType]?.es || type,
    value: count,
  }))

  // Bookings by hour
  const byHour = bookings.reduce<Record<string, number>>((acc, b) => {
    const hour = b.session?.start_time?.slice(0, 2) || '00'
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {})

  const hourData = Object.entries(byHour)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))

  // Revenue
  const revenue = packageSales.reduce((sum, s) => sum + (s.package?.price_mxn || 0), 0)

  const stats: { icon: IconDefinition; label: string; value: number | string }[] = [
    { icon: faCalendarDays, label: 'Reservas', value: bookings.length },
    { icon: faArrowTrendUp, label: 'Ingresos estimados', value: `$${revenue.toLocaleString('es-MX')} MXN` },
    { icon: faUsers, label: 'Membresías vendidas', value: packageSales.length },
    { icon: faComment, label: 'Solicitudes de clase', value: requests.length },
  ]

  function navigate(newMonth: number, newYear: number) {
    router.push(`/${locale}/admin/metrics?month=${newMonth}&year=${newYear}`)
  }

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={stat.icon} className="w-4 h-4 text-primary/60" />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* By hour */}
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

        {/* By type */}
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
