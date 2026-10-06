import { createClient } from '@/lib/supabase/server'
import MetricsDashboard from '@/components/admin/MetricsDashboard'

export default async function MetricsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const { locale } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const now = new Date()
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1
  const year = sp.year ? parseInt(sp.year) : now.getFullYear()

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]

  // Prev month dates
  const prevMonthEnd = new Date(year, month - 1, 0).toISOString().split('T')[0]
  const prevMonthStart = new Date(year, month - 2, 1).toISOString().split('T')[0]

  const [bookingsRes, requestsRes, packageSalesRes, sessionsRes, prevBookingRes, prevRevenueRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, session:class_sessions(date, start_time, class_type, capacity), profile:profiles(full_name, email)')
      .eq('status', 'confirmed')
      .gte('booked_at', `${monthStart}T00:00:00`)
      .lte('booked_at', `${monthEnd}T23:59:59`),
    supabase
      .from('class_requests')
      .select('*')
      .gte('created_at', `${monthStart}T00:00:00`)
      .lte('created_at', `${monthEnd}T23:59:59`),
    supabase
      .from('user_packages')
      .select('*, package:packages(name_es, price_mxn)')
      .not('stripe_payment_id', 'is', null)
      .gte('purchased_at', `${monthStart}T00:00:00`)
      .lte('purchased_at', `${monthEnd}T23:59:59`),
    supabase
      .from('class_sessions')
      .select('spots_booked, capacity, class_type, date')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .neq('status', 'cancelled'),
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('booked_at', `${prevMonthStart}T00:00:00`)
      .lte('booked_at', `${prevMonthEnd}T23:59:59`),
    supabase
      .from('user_packages')
      .select('*, package:packages(price_mxn)')
      .not('stripe_payment_id', 'is', null)
      .gte('purchased_at', `${prevMonthStart}T00:00:00`)
      .lte('purchased_at', `${prevMonthEnd}T23:59:59`),
  ])

  const prevMonthRevenue = (prevRevenueRes.data || []).reduce(
    (sum: number, s: any) => sum + (s.package?.price_mxn || 0),
    0
  )

  return (
    <MetricsDashboard
      bookings={bookingsRes.data || []}
      requests={requestsRes.data || []}
      packageSales={packageSalesRes.data || []}
      sessions={sessionsRes.data || []}
      prevMonthBookingCount={prevBookingRes.count || 0}
      prevMonthRevenue={prevMonthRevenue}
      month={month}
      year={year}
      locale={locale}
    />
  )
}
