import { createClient } from '@/lib/supabase/server'
import AdminSchedule from '@/components/admin/AdminSchedule'

export default async function AdminSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const profileRes = user ? await supabase.from('profiles').select('is_admin').eq('id', user.id).single() : null
  const isAdmin = profileRes?.data?.is_admin === true

  // Use Mexico City time so the date doesn't flip to tomorrow after 6 PM local time
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  const limitDate = new Date(todayStr + 'T00:00:00')
  limitDate.setDate(limitDate.getDate() + 30)
  const limitStr = limitDate.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })

  const [sessionsRes, instructorsRes, templatesRes, requestsRes, eventsRes, classTypesRes] = await Promise.all([
    supabase
      .from('class_sessions')
      .select('*, instructor:instructors(*)')
      .gte('date', todayStr)
      .lte('date', limitStr)
      .eq('is_special', false)
      .order('date')
      .order('start_time'),
    supabase.from('instructors').select('*').order('name'),
    supabase
      .from('recurring_templates')
      .select('*, instructor:instructors(*)')
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time'),
    supabase
      .from('class_requests')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('class_sessions')
      .select('*, instructor:instructors(*)')
      .eq('is_special', true)
      .order('date')
      .order('start_time'),
    supabase.from('class_types').select('*').order('sort_order'),
  ])

  // Fetch waitlist counts for upcoming sessions
  const upcomingIds = (sessionsRes.data || []).map((s) => s.id)
  const waitlistRows = upcomingIds.length > 0
    ? (await supabase.from('bookings').select('session_id').eq('status', 'waitlist').in('session_id', upcomingIds)).data || []
    : []
  const waitlistCounts: Record<string, number> = {}
  for (const row of waitlistRows) {
    waitlistCounts[row.session_id] = (waitlistCounts[row.session_id] || 0) + 1
  }

  return (
    <AdminSchedule
      sessions={sessionsRes.data || []}
      instructors={instructorsRes.data || []}
      templates={templatesRes.data || []}
      requests={requestsRes.data || []}
      events={eventsRes.data || []}
      classTypes={classTypesRes.data || []}
      locale={locale}
      isAdmin={isAdmin}
      waitlistCounts={waitlistCounts}
    />
  )
}
