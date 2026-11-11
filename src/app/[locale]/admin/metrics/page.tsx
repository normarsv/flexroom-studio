import { createAdminClient } from '@/lib/supabase/admin'
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

  const now = new Date()
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1
  const year = sp.year ? parseInt(sp.year) : now.getFullYear()

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]
  const prevMonthEnd = new Date(year, month - 1, 0).toISOString().split('T')[0]
  const prevMonthStart = new Date(year, month - 2, 1).toISOString().split('T')[0]

  const supabase = createAdminClient()

  const [
    bookingsRes,
    cancelledCountRes,
    allPackageSalesRes,
    sessionsRes,
    waitlistRes,
    prevBookingUsersRes,
    prevAllPackageSalesRes,
    newClientsCountRes,
  ] = await Promise.all([
    // Confirmed bookings this month
    supabase
      .from('bookings')
      .select('id, user_id, attended, session:class_sessions(date, start_time, class_type, capacity), profile:profiles(full_name, email)')
      .eq('status', 'confirmed')
      .gte('booked_at', `${monthStart}T00:00:00`)
      .lte('booked_at', `${monthEnd}T23:59:59`),

    // Cancelled bookings count this month
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('booked_at', `${monthStart}T00:00:00`)
      .lte('booked_at', `${monthEnd}T23:59:59`),

    // All package sales this month (Stripe + cash + transfer)
    supabase
      .from('user_packages')
      .select('id, package:packages(price_mxn)')
      .gte('purchased_at', `${monthStart}T00:00:00`)
      .lte('purchased_at', `${monthEnd}T23:59:59`),

    // All sessions this month with instructor name
    supabase
      .from('class_sessions')
      .select('id, spots_booked, capacity, class_type, date, start_time, status, instructor:instructors(name)')
      .gte('date', monthStart)
      .lte('date', monthEnd),

    // Current waitlist bookings (to show demand per class type)
    supabase
      .from('bookings')
      .select('session:class_sessions(class_type, date)')
      .eq('status', 'waitlist'),

    // Previous month confirmed bookings (user_ids for retention)
    supabase
      .from('bookings')
      .select('user_id')
      .eq('status', 'confirmed')
      .gte('booked_at', `${prevMonthStart}T00:00:00`)
      .lte('booked_at', `${prevMonthEnd}T23:59:59`),

    // Previous month all package sales (for revenue delta)
    supabase
      .from('user_packages')
      .select('id, package:packages(price_mxn)')
      .gte('purchased_at', `${prevMonthStart}T00:00:00`)
      .lte('purchased_at', `${prevMonthEnd}T23:59:59`),

    // New clients this month
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_admin', false)
      .gte('created_at', `${monthStart}T00:00:00`)
      .lte('created_at', `${monthEnd}T23:59:59`),
  ])

  const prevMonthRevenue = (prevAllPackageSalesRes.data || []).reduce(
    (sum: number, s: any) => sum + (s.package?.price_mxn || 0), 0
  )
  const prevMonthBookingCount = (prevBookingUsersRes.data || []).length

  return (
    <MetricsDashboard
      bookings={bookingsRes.data || []}
      cancelledCount={cancelledCountRes.count || 0}
      allPackageSales={allPackageSalesRes.data || []}
      sessions={sessionsRes.data || []}
      waitlistBookings={waitlistRes.data || []}
      prevMonthUserIds={(prevBookingUsersRes.data || []).map((b: any) => b.user_id).filter(Boolean)}
      prevMonthRevenue={prevMonthRevenue}
      prevMonthBookingCount={prevMonthBookingCount}
      newClientsCount={newClientsCountRes.count || 0}
      month={month}
      year={year}
      locale={locale}
    />
  )
}
