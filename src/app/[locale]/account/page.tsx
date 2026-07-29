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

  // Coaches go straight to the schedule panel
  const { data: roleCheck } = await supabase.from('profiles').select('is_coach, is_admin').eq('id', user.id).single()
  if (roleCheck?.is_coach && !roleCheck?.is_admin) redirect(`/${locale}/admin/schedule`)

  const now = new Date().toISOString()

  const [bookingsRes, packagesRes, profileRes, settingsRes, creditsRes] = await Promise.all([
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
      .select('full_name, email, avatar_url, phone')
      .eq('id', user.id)
      .single(),
    supabase
      .from('studio_settings')
      .select('cancellation_hours_limit')
      .eq('id', 1)
      .single(),
    supabase
      .from('credits')
      .select('id, class_type')
      .eq('user_id', user.id)
      .eq('used', false),
  ])

  return (
    <AccountDashboard
      bookings={bookingsRes.data || []}
      userPackages={packagesRes.data || []}
      profile={profileRes.data}
      credits={creditsRes.data || []}
      cancellationHoursLimit={settingsRes.data?.cancellation_hours_limit ?? 12}
      locale={locale}
    />
  )
}
