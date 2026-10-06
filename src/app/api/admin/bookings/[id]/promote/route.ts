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
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { station } = await request.json().catch(() => ({}))

  const adminClient = createAdminClient()

  const { data: booking } = await adminClient
    .from('bookings')
    .select('id, status, session_id')
    .eq('id', id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  if (booking.status !== 'waitlist') return NextResponse.json({ error: 'La reserva no está en lista de espera' }, { status: 400 })

  const update: any = { status: 'confirmed' }
  if (station) update.station = station

  const { error } = await adminClient.from('bookings').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Increment spots_booked since this person now occupies a spot
  await adminClient.rpc('claim_session_spot', { p_session_id: booking.session_id })

  return NextResponse.json({ success: true })
}
