import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendWaitlistSpotAvailable } from '@/lib/email'

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
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const adminClient = createAdminClient()

  const { data: booking } = await adminClient
    .from('bookings')
    .select('*, session:class_sessions(*)')
    .eq('id', id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  if (booking.status === 'cancelled') return NextResponse.json({ error: 'Ya cancelada' }, { status: 400 })

  // Cancel the booking
  await adminClient
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)

  // Credit logic — only for confirmed bookings that were paid
  if (booking.status === 'confirmed' && booking.payment_status === 'paid') {
    if (booking.user_package_id) {
      // Return session to package
      const { data: up } = await adminClient
        .from('user_packages')
        .select('sessions_remaining')
        .eq('id', booking.user_package_id)
        .single()
      if (up && up.sessions_remaining !== null) {
        await adminClient
          .from('user_packages')
          .update({ sessions_remaining: up.sessions_remaining + 1 })
          .eq('id', booking.user_package_id)
      }
    } else if (booking.user_id) {
      // Grant a cancellation credit
      await adminClient
        .from('credits')
        .insert({ user_id: booking.user_id, class_type: booking.session.class_type })
    }
  }

  // Always release the spot — no auto-promotion
  await adminClient.rpc('release_session_spot', { p_session_id: booking.session_id })

  // Notify everyone on the waitlist so they can race to book
  const { data: waitlist } = await adminClient
    .from('bookings')
    .select('user_id')
    .eq('session_id', booking.session_id)
    .eq('status', 'waitlist')
    .order('booked_at', { ascending: true })

  if (waitlist && waitlist.length > 0) {
    const userIds = waitlist.map((w: any) => w.user_id).filter(Boolean)
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    if (profiles) {
      const othersTotal = profiles.length
      for (const prof of profiles) {
        sendWaitlistSpotAvailable({
          to: prof.email,
          name: prof.full_name || prof.email,
          session: booking.session,
          othersInWaitlist: othersTotal - 1,
        }).catch(console.error)
      }
    }
  }

  const creditGranted = booking.status === 'confirmed' && booking.payment_status === 'paid'
  return NextResponse.json({ success: true, creditGranted })
}
