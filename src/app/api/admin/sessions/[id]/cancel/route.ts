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

  // Fetch session + confirmed bookings before cancelling
  const [sessionRes, bookingsRes] = await Promise.all([
    adminClient.from('class_sessions').select('*, instructor:instructors(*)').eq('id', id).single(),
    adminClient
      .from('bookings')
      .select('user_id, guest_email, guest_name, profiles:profiles(email, full_name)')
      .eq('session_id', id)
      .eq('status', 'confirmed'),
  ])

  const { error } = await adminClient
    .from('class_sessions')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify all confirmed clients
  if (sessionRes.data && bookingsRes.data) {
    const session = sessionRes.data
    for (const booking of bookingsRes.data) {
      const profile = (booking as any).profiles
      const email = profile?.email || (booking as any).guest_email
      const name = profile?.full_name || (booking as any).guest_name || email
      if (email) {
        sendSessionCancelledNotification({ to: email, name, session }).catch(console.error)
      }
    }
  }

  return NextResponse.json({ success: true })
}
