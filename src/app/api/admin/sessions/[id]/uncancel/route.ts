import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // Fetch session class_type + cancelled bookings to reverse refunds
  const [sessionRes, bookingsRes] = await Promise.all([
    adminClient.from('class_sessions').select('class_type, status').eq('id', id).single(),
    adminClient
      .from('bookings')
      .select('id, user_id, user_package_id, payment_status')
      .eq('session_id', id)
      .eq('status', 'cancelled'),
  ])

  const session = sessionRes.data
  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  if (session.status !== 'cancelled') return NextResponse.json({ error: 'La clase no está cancelada' }, { status: 400 })

  const bookings = bookingsRes.data || []

  // Restore session to scheduled
  const { error } = await adminClient
    .from('class_sessions')
    .update({ status: 'scheduled' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Restore cancelled bookings back to confirmed
  await adminClient
    .from('bookings')
    .update({ status: 'confirmed', cancelled_at: null })
    .eq('session_id', id)
    .eq('status', 'cancelled')

  // Reverse refunds
  for (const booking of bookings) {
    if (booking.payment_status !== 'paid') continue

    if (booking.user_package_id) {
      // Deduct one session from the package
      const { data: up } = await adminClient
        .from('user_packages')
        .select('sessions_remaining')
        .eq('id', booking.user_package_id)
        .single()
      if (up && up.sessions_remaining !== null) {
        await adminClient
          .from('user_packages')
          .update({ sessions_remaining: Math.max(0, up.sessions_remaining - 1) })
          .eq('id', booking.user_package_id)
      }
    } else if (booking.user_id) {
      // Delete the most recent unused credit of that class type for this user
      const { data: credit } = await adminClient
        .from('credits')
        .select('id')
        .eq('user_id', booking.user_id)
        .eq('class_type', session.class_type)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (credit) {
        await adminClient.from('credits').delete().eq('id', credit.id)
      }
    }
  }

  // Update spots_booked to restored confirmed count
  await adminClient
    .from('class_sessions')
    .update({ spots_booked: bookings.length })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
