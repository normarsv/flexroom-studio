import { createClient } from '@/lib/supabase/server'
import AdminSchedule from '@/components/admin/AdminSchedule'

export default async function AdminSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const today = new Date()
  const limit = new Date()
  limit.setDate(today.getDate() + 30)

  const { data: { user } } = await supabase.auth.getUser()
  const profileRes = user ? await supabase.from('profiles').select('is_admin').eq('id', user.id).single() : null
  const isAdmin = profileRes?.data?.is_admin === true

  const todayStr = today.toISOString().split('T')[0]

  const [sessionsRes, instructorsRes, templatesRes, requestsRes, eventsRes] = await Promise.all([
    supabase
      .from('class_sessions')
      .select('*, instructor:instructors(*)')
      .gte('date', todayStr)
      .lte('date', limit.toISOString().split('T')[0])
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
  ])

  return (
    <AdminSchedule
      sessions={sessionsRes.data || []}
      instructors={instructorsRes.data || []}
      templates={templatesRes.data || []}
      requests={requestsRes.data || []}
      events={eventsRes.data || []}
      locale={locale}
      isAdmin={isAdmin}
    />
  )
}
