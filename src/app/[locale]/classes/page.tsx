import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ClassSchedule from '@/components/classes/ClassSchedule'

// Cache the public session data for 2 minutes.
// User-specific state (packages, bookings, credits) is fetched client-side
// via /api/user/booking-context so this page can be served from cache.
export const revalidate = 120

export default async function ClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
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
    .eq('is_hidden', false)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  // Fetch taken stations for all sessions (admin client bypasses RLS)
  const sessionIds = (sessions || []).map((s) => s.id)
  const takenStations: Record<string, number[]> = {}
  if (sessionIds.length > 0) {
    const adminClient = createAdminClient()
    const { data: stationBookings } = await adminClient
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
  // Treat blocked stations as taken so customers can't select them
  for (const s of sessions || []) {
    if (s.blocked_stations?.length > 0) {
      takenStations[s.id] = [...new Set([...(takenStations[s.id] ?? []), ...s.blocked_stations])]
    }
  }

  const [{ data: studioSettings }, { data: classTypes }] = await Promise.all([
    supabase.from('studio_settings').select('station_map_url').eq('id', 1).single(),
    supabase.from('class_types').select('*').eq('is_active', true).order('sort_order'),
  ])

  return (
    // Suspense is required for useSearchParams() inside ClassSchedule
    <Suspense>
      <ClassSchedule
        sessions={sessions || []}
        locale={locale}
        takenStations={takenStations}
        stationMapUrl={studioSettings?.station_map_url ?? null}
        classTypes={classTypes || []}
      />
    </Suspense>
  )
}
