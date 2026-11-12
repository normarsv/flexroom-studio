import { createAdminClient } from '@/lib/supabase/admin'
import MetricsDashboard from '@/components/admin/MetricsDashboard'

export const revalidate = 300 // cache for 5 minutes — metrics show historical data

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
      .select('id, payment_method, stripe_payment_intent_id, package:packages(name_es, price_mxn)')
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

    // Previous month confirmed bookings (with profiles for retention drill-down)
    supabase
      .from('bookings')
      .select('user_id, profile:profiles(full_name, email)')
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
  // Deduplicate prev month users (one entry per unique user_id)
  const prevMonthUsersMap = new Map<string, { full_name: string | null; email: string }>()
  for (const b of prevBookingUsersRes.data || []) {
    if (b.user_id && !prevMonthUsersMap.has(b.user_id)) {
      const prof = Array.isArray(b.profile) ? b.profile[0] : b.profile
      prevMonthUsersMap.set(b.user_id, { full_name: prof?.full_name ?? null, email: prof?.email ?? '' })
    }
  }
  const prevMonthUsers = Array.from(prevMonthUsersMap.entries()).map(([id, profile]) => ({ id, ...profile }))
  const prevMonthBookingCount = prevMonthUsers.length

  return (
    <MetricsDashboard
      bookings={bookingsRes.data || []}
      cancelledCount={cancelledCountRes.count || 0}
      allPackageSales={allPackageSalesRes.data || []}
      sessions={sessionsRes.data || []}
      waitlistBookings={waitlistRes.data || []}
      prevMonthUsers={prevMonthUsers}
      prevMonthRevenue={prevMonthRevenue}
      prevMonthBookingCount={prevMonthBookingCount}
      newClientsCount={newClientsCountRes.count || 0}
      month={month}
      year={year}
      locale={locale}
    />
  )
}
