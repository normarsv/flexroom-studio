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
  let waitlistedSessionIds: string[] = []
  let credits: { id: string; class_type: string }[] = []

  if (user) {
    const [packagesRes, bookingsRes, creditsRes] = await Promise.all([
      supabase
        .from('user_packages')
        .select('*, package:packages(*)')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .gt('sessions_remaining', 0),
      supabase
        .from('bookings')
        .select('session_id, status')
        .eq('user_id', user.id)
        .neq('status', 'cancelled'),
      supabase
        .from('credits')
        .select('id, class_type')
        .eq('user_id', user.id)
        .eq('used', false),
    ])
    userPackages = packagesRes.data
    bookedSessionIds = (bookingsRes.data || []).filter((b) => b.status === 'confirmed').map((b) => b.session_id)
    waitlistedSessionIds = (bookingsRes.data || []).filter((b) => b.status === 'waitlist').map((b) => b.session_id)
    credits = creditsRes.data || []
  }

  // Fetch taken stations for all upcoming sessions + station map image
  const sessionIds = (sessions || []).map((s) => s.id)
  const takenStations: Record<string, number[]> = {}
  if (sessionIds.length > 0) {
    const { data: stationBookings } = await supabase
      .from('bookings')
      .select('session_id, station')
      .in('session_id', sessionIds)
      .eq('status', 'confirmed')
      .not('station', 'is', null)
    for (const b of stationBookings || []) {
      if (!takenStations[b.session_id]) takenStations[b.session_id] = []
      takenStations[b.session_id].push(b.station)
    }
  }
  // Also treat blocked stations as taken so customers can't book them
  for (const s of sessions || []) {
    if (s.blocked_stations?.length > 0) {
      takenStations[s.id] = [...new Set([...(takenStations[s.id] ?? []), ...s.blocked_stations])]
    }
  }

  const { data: studioSettings } = await supabase
    .from('studio_settings')
    .select('station_map_url')
    .eq('id', 1)
    .single()

  return (
    <ClassSchedule
      sessions={sessions || []}
      locale={locale}
      userId={user?.id || null}
      userPackages={userPackages || []}
      bookedSessionIds={bookedSessionIds}
      waitlistedSessionIds={waitlistedSessionIds}
      bookingSuccess={booking === 'success'}
      credits={credits}
      takenStations={takenStations}
      stationMapUrl={studioSettings?.station_map_url ?? null}
    />
  )
}
