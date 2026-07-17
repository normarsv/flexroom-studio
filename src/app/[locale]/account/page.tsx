import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountDashboard from '@/components/account/AccountDashboard'

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/login`)

  const now = new Date().toISOString()

  const [bookingsRes, packagesRes, profileRes, settingsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, session:class_sessions(*, instructor:instructors(*))')
      .eq('user_id', user.id)
      .neq('status', 'cancelled')
      .order('booked_at', { ascending: false })
      .limit(50),
    supabase
      .from('user_packages')
      .select('*, package:packages(*)')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('full_name, email, avatar_url, credit_sessions')
      .eq('id', user.id)
      .single(),
    supabase
      .from('studio_settings')
      .select('cancellation_hours_limit')
      .eq('id', 1)
      .single(),
  ])

  return (
    <AccountDashboard
      bookings={bookingsRes.data || []}
      userPackages={packagesRes.data || []}
      profile={profileRes.data}
      creditSessions={profileRes.data?.credit_sessions ?? 0}
      cancellationHoursLimit={settingsRes.data?.cancellation_hours_limit ?? 12}
      locale={locale}
    />
  )
}
