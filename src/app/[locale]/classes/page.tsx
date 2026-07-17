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

  const today = new Date()
  const limit = new Date()
  limit.setDate(today.getDate() + 15)

  const { data: sessions } = await supabase
    .from('class_sessions')
    .select(`
      *,
      instructor:instructors(*)
    `)
    .gte('date', today.toISOString().split('T')[0])
    .lte('date', limit.toISOString().split('T')[0])
    .eq('status', 'scheduled')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  let userPackages = null
  let bookedSessionIds: string[] = []

  if (user) {
    const [packagesRes, bookingsRes] = await Promise.all([
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
    ])
    userPackages = packagesRes.data
    bookedSessionIds = (bookingsRes.data || []).map((b) => b.session_id)
  }

  return (
    <ClassSchedule
      sessions={sessions || []}
      locale={locale}
      userId={user?.id || null}
      userPackages={userPackages || []}
      bookedSessionIds={bookedSessionIds}
      bookingSuccess={booking === 'success'}
    />
  )
}
