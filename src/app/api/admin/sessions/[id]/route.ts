import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function getRole(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('is_admin, is_coach').eq('id', user.id).single()
  if (!profile) return null
  return { isAdmin: profile.is_admin === true, isCoach: profile.is_coach === true }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const role = await getRole(supabase)
  if (!role || (!role.isAdmin && !role.isCoach)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()

  // Coaches can only change the instructor
  if (!role.isAdmin && role.isCoach) {
    const { instructor_id } = body
    if (!instructor_id) return NextResponse.json({ error: 'instructor_id requerido' }, { status: 400 })
    const { data, error } = await supabase
      .from('class_sessions')
      .update({ instructor_id })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ session: data })
  }

  const { date, start_time, duration_minutes, class_type, instructor_id, capacity, custom_title, is_special, event_title, event_description, event_type_label } = body

  const { data, error } = await supabase
    .from('class_sessions')
    .update({
      date, start_time, duration_minutes, class_type, instructor_id,
      capacity, custom_title: custom_title || null,
      is_special: is_special || false,
      event_title: is_special ? (event_title || null) : null,
      event_description: is_special ? (event_description || null) : null,
      event_type_label: is_special ? (event_type_label || null) : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // Delete all associated bookings first
  const { error: bookingsError } = await adminClient
    .from('bookings')
    .delete()
    .eq('session_id', id)

  if (bookingsError) return NextResponse.json({ error: bookingsError.message }, { status: 500 })

  // Delete the session
  const { error } = await adminClient
    .from('class_sessions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
