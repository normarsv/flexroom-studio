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

  const [sessionsRes, instructorsRes, templatesRes] = await Promise.all([
    supabase
      .from('class_sessions')
      .select('*, instructor:instructors(*)')
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', limit.toISOString().split('T')[0])
      .order('date')
      .order('start_time'),
    supabase.from('instructors').select('*').order('name'),
    supabase
      .from('recurring_templates')
      .select('*, instructor:instructors(*)')
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time'),
  ])

  return (
    <AdminSchedule
      sessions={sessionsRes.data || []}
      instructors={instructorsRes.data || []}
      templates={templatesRes.data || []}
      locale={locale}
    />
  )
}
