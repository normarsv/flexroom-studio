import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { date, start_time, duration_minutes, class_type, instructor_id, capacity, is_special, event_title, event_description, event_type_label } = body

  const { data, error } = await supabase
    .from('class_sessions')
    .insert({
      date,
      start_time,
      duration_minutes: duration_minutes || 50,
      class_type,
      instructor_id: instructor_id || null,
      capacity: capacity || 5,
      spots_booked: 0,
      status: 'scheduled',
      is_recurring: false,
      is_special: is_special || false,
      event_title: is_special ? (event_title || null) : null,
      event_description: is_special ? (event_description || null) : null,
      event_type_label: is_special ? (event_type_label || null) : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data })
}
