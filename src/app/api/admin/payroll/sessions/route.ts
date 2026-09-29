import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

// GET ?instructor_id=&from=yyyy-MM-dd&to=yyyy-MM-dd
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const instructorId = searchParams.get('instructor_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!instructorId || !from || !to) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('class_sessions')
    .select('id, date, start_time, class_type, capacity, spots_booked, status, instructor_paid_at, instructor_payment_notes, is_special, event_title, custom_title')
    .eq('instructor_id', instructorId)
    .gte('date', from)
    .lte('date', to)
    .neq('status', 'cancelled')
    .order('date')
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
