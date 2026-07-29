import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendWaitlistPromotion } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const [bookingRes, settingsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, session:class_sessions(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('studio_settings')
      .select('cancellation_hours_limit')
      .eq('id', 1)
      .single(),
  ])

  const booking = bookingRes.data
  if (!booking) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  }
  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Esta reserva ya fue cancelada' }, { status: 400 })
  }

  const cancellationHoursLimit = settingsRes.data?.cancellation_hours_limit ?? 12
  const sessionDateTime = new Date(`${booking.session.date}T${booking.session.start_time}`)
  const hoursUntilClass = (sessionDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
  const creditGranted = hoursUntilClass >= cancellationHoursLimit

  // Cancel booking
  await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)

  // Only handle credit/package refund if this was a confirmed booking (not waitlist)
  if (booking.status === 'confirmed') {
    if (creditGranted) {
      if (booking.user_package_id) {
        const { data: up } = await supabase
          .from('user_packages')
          .select('sessions_remaining')
          .eq('id', booking.user_package_id)
          .single()

        if (up && up.sessions_remaining !== null) {
          await supabase
            .from('user_packages')
            .update({ sessions_remaining: up.sessions_remaining + 1 })
            .eq('id', booking.user_package_id)
        }
      } else {
        await supabase
          .from('credits')
          .insert({ user_id: user.id, class_type: booking.session.class_type })
      }
    }

    // Try to promote the next person from the waitlist
    const adminClient = createAdminClient()
    const { data: next } = await adminClient
      .from('bookings')
      .select('id, user_id, user_package_id')
      .eq('session_id', booking.session_id)
      .eq('status', 'waitlist')
      .order('booked_at', { ascending: true })
      .limit(1)
      .single()

    if (next) {
      // Promote to confirmed — spot stays occupied so spots_booked doesn't change
      await adminClient.from('bookings').update({ status: 'confirmed' }).eq('id', next.id)

      // Deduct from their package if they had one
      if (next.user_package_id) {
        const { data: up } = await adminClient
          .from('user_packages')
          .select('sessions_remaining')
          .eq('id', next.user_package_id)
          .single()
        if (up && up.sessions_remaining !== null) {
          await adminClient
            .from('user_packages')
            .update({ sessions_remaining: up.sessions_remaining - 1 })
            .eq('id', next.user_package_id)
        }
      }

      // Send promotion email
      const { data: prof } = await adminClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', next.user_id)
        .single()
      if (prof) {
        sendWaitlistPromotion({ to: prof.email, name: prof.full_name || prof.email, session: booking.session }).catch(console.error)
      }
    } else {
      // No one on waitlist — release the spot
      await supabase.rpc('release_session_spot', { p_session_id: booking.session_id })
    }
  } else {
    // Cancelling a waitlist booking — just release nothing, spot was never taken
  }

  return NextResponse.json({ success: true, creditGranted: booking.status === 'confirmed' ? creditGranted : false, cancellationHoursLimit })
}
