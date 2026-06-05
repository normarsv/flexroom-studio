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

  const [bookingsRes, requestsRes, packageSalesRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, session:class_sessions(date, start_time, class_type, capacity)')
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
      .gte('purchased_at', `${monthStart}T00:00:00`)
      .lte('purchased_at', `${monthEnd}T23:59:59`),
  ])

  return (
    <MetricsDashboard
      bookings={bookingsRes.data || []}
      requests={requestsRes.data || []}
      packageSales={packageSalesRes.data || []}
      month={month}
      year={year}
      locale={locale}
    />
  )
}
