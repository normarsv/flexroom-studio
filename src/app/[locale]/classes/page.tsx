import { createClient } from '@/lib/supabase/server'
import ClassSchedule from '@/components/classes/ClassSchedule'

export const dynamic = 'force-dynamic'

export default async function ClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
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
  if (user) {
    const { data } = await supabase
      .from('user_packages')
      .select('*, package:packages(*)')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .gt('sessions_remaining', 0)
    userPackages = data
  }

  return (
    <ClassSchedule
      sessions={sessions || []}
      locale={locale}
      userId={user?.id || null}
      userPackages={userPackages || []}
    />
  )
}
