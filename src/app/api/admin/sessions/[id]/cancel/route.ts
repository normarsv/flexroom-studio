import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendSessionCancelledNotification } from '@/lib/email'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const [sessionRes, bookingsRes] = await Promise.all([
    adminClient.from('class_sessions').select('class_type').eq('id', id).single(),
    adminClient
      .from('bookings')
      .select('user_id, user_package_id, guest_email, guest_name, payment_status, profile:profiles(full_name, phone)')
      .eq('session_id', id)
      .eq('status', 'cancelled'),
  ])

  if (!sessionRes.data) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  const registrants = (bookingsRes.data || []).map((booking: any) => {
    const isGuest = !booking.user_id
    const isPaid = booking.payment_status === 'paid'
    let refundType: 'package' | 'credit' | 'none' | 'guest' = 'none'
    if (isGuest) refundType = 'guest'
    else if (isPaid) refundType = booking.user_package_id ? 'package' : 'credit'
    return {
      name: booking.profile?.full_name || booking.guest_name || booking.guest_email || 'Sin nombre',
      phone: booking.profile?.phone || null,
      isGuest,
      refundType,
    }
  })

  return NextResponse.json({ registrants })
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

  // Fetch session + confirmed bookings (with package info and phone for WhatsApp)
  const [sessionRes, bookingsRes] = await Promise.all([
    adminClient.from('class_sessions').select('*, instructor:instructors(*)').eq('id', id).single(),
    adminClient
      .from('bookings')
      .select('id, user_id, user_package_id, guest_email, guest_name, payment_status, profile:profiles(email, full_name, phone)')
      .eq('session_id', id)
      .eq('status', 'confirmed'),
  ])

  const session = sessionRes.data
  const bookings = bookingsRes.data || []

  // Cancel the session
  const { error } = await adminClient
    .from('class_sessions')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Process refunds + cancel each confirmed booking
  const registrants: { name: string; phone: string | null; isGuest: boolean; refundType: 'package' | 'credit' | 'none' | 'guest' }[] = []

  for (const booking of bookings) {
    const profile = (booking as any).profile
    const isGuest = !booking.user_id
    const isPaid = booking.payment_status === 'paid'
    let refundType: 'package' | 'credit' | 'none' | 'guest' = 'none'

    if (isGuest) {
      refundType = 'guest'
    } else if (isPaid) {
      if (booking.user_package_id) {
        // Restore one session to the package (unless unlimited)
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
        refundType = 'package'
      } else if (booking.user_id) {
        // Grant a credit of the same class type
        await adminClient
          .from('credits')
          .insert({ user_id: booking.user_id, class_type: session.class_type })
        refundType = 'credit'
      }
    }

    registrants.push({
      name: profile?.full_name || booking.guest_name || booking.guest_email || 'Sin nombre',
      phone: profile?.phone || null,
      isGuest,
      refundType,
    })

    // Send email notification
    const email = profile?.email || booking.guest_email
    const name = profile?.full_name || booking.guest_name || email
    if (email && session) {
      sendSessionCancelledNotification({ to: email, name, session }).catch(console.error)
    }
  }

  // Mark all confirmed bookings as cancelled
  await adminClient
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('session_id', id)
    .eq('status', 'confirmed')

  return NextResponse.json({ success: true, registrants })
}
