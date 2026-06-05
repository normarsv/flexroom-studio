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

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, session:class_sessions(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Esta reserva ya fue cancelada' }, { status: 400 })
  }

  // Enforce 12h cancellation policy
  const sessionDateTime = new Date(`${booking.session.date}T${booking.session.start_time}`)
  const hoursUntilClass = (sessionDateTime.getTime() - Date.now()) / (1000 * 60 * 60)

  if (hoursUntilClass < 12) {
    return NextResponse.json(
      { error: 'No puedes cancelar con menos de 12 horas de anticipación' },
      { status: 400 }
    )
  }

  // Cancel booking
  await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)

  // Restore session count
  await supabase
    .from('class_sessions')
    .update({ spots_booked: Math.max(0, booking.session.spots_booked - 1) })
    .eq('id', booking.session_id)

  // Restore package session if applicable
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
  }

  return NextResponse.json({ success: true })
}
