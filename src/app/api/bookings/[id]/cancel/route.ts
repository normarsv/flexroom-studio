import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

  // Free up the spot
  await supabase
    .from('class_sessions')
    .update({ spots_booked: Math.max(0, booking.session.spots_booked - 1) })
    .eq('id', booking.session_id)

  if (creditGranted) {
    if (booking.user_package_id) {
      // Restore session to their package
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
      // Single-class booking — add a credit session to profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('credit_sessions')
        .eq('id', user.id)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({ credit_sessions: profile.credit_sessions + 1 })
          .eq('id', user.id)
      }
    }
  }

  return NextResponse.json({ success: true, creditGranted, cancellationHoursLimit })
}
