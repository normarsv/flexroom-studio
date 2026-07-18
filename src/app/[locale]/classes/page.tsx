import { createClient } from '@/lib/supabase/server'
import ClassSchedule from '@/components/classes/ClassSchedule'

export const dynamic = 'force-dynamic'

export default async function ClassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ booking?: string }>
}) {
  const { locale } = await params
  const { booking } = await searchParams
  const supabase = await createClient()

  const todayMx = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  const limitDate = new Date(todayMx + 'T00:00:00')
  limitDate.setDate(limitDate.getDate() + 15)
  const limitMx = limitDate.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })

  const { data: sessions } = await supabase
    .from('class_sessions')
    .select(`
      *,
      instructor:instructors(*)
    `)
    .gte('date', todayMx)
    .lte('date', limitMx)
    .eq('status', 'scheduled')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  let userPackages = null
  let bookedSessionIds: string[] = []
  let creditSessions = 0

  if (user) {
    const [packagesRes, bookingsRes, profileRes] = await Promise.all([
      supabase
        .from('user_packages')
        .select('*, package:packages(*)')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .gt('sessions_remaining', 0),
      supabase
        .from('bookings')
        .select('session_id')
        .eq('user_id', user.id)
        .neq('status', 'cancelled'),
      supabase
        .from('profiles')
        .select('credit_sessions')
        .eq('id', user.id)
        .single(),
    ])
    userPackages = packagesRes.data
    bookedSessionIds = (bookingsRes.data || []).map((b) => b.session_id)
    creditSessions = profileRes.data?.credit_sessions ?? 0
  }

  return (
    <ClassSchedule
      sessions={sessions || []}
      locale={locale}
      userId={user?.id || null}
      userPackages={userPackages || []}
      bookedSessionIds={bookedSessionIds}
      bookingSuccess={booking === 'success'}
      creditSessions={creditSessions}
    />
  )
}
