import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { addDays, format, getDay } from 'date-fns'

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

  const { data: templates } = await supabase
    .from('recurring_templates')
    .select('*')
    .eq('is_active', true)

  if (!templates || templates.length === 0) {
    return NextResponse.json({ message: 'No hay plantillas activas' })
  }

  const today = new Date()
  const startStr = format(today, 'yyyy-MM-dd')
  const endStr = format(addDays(today, 13), 'yyyy-MM-dd')

  // Fetch all recurring sessions in the window upfront (avoids N+1 queries)
  const { data: existingSessions } = await supabase
    .from('class_sessions')
    .select('id, date, start_time, duration_minutes, class_type, instructor_id, capacity, spots_booked, recurring_template_id')
    .eq('is_recurring', true)
    .gte('date', startStr)
    .lte('date', endStr)

  const existing = existingSessions || []

  const toInsert: any[] = []
  const toUpdate: { id: string; updates: Record<string, any> }[] = []
  const matchedIds = new Set<string>()

  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i)
    const dayOfWeek = getDay(date)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayTemplates = templates.filter((t) => t.day_of_week === dayOfWeek)

    for (const template of dayTemplates) {
      // Match by template ID first, then fall back to key fields
      let session = existing.find(
        (s) => s.date === dateStr && s.recurring_template_id === template.id
      )
      if (!session) {
        session = existing.find(
          (s) =>
            s.date === dateStr &&
            s.start_time === template.start_time &&
            s.class_type === template.class_type &&
            s.instructor_id === template.instructor_id
        )
      }

      if (!session) {
        toInsert.push({
          date: dateStr,
          start_time: template.start_time,
          duration_minutes: template.duration_minutes,
          class_type: template.class_type,
          instructor_id: template.instructor_id,
          capacity: template.capacity,
          spots_booked: 0,
          status: 'scheduled',
          is_recurring: true,
          recurring_template_id: template.id,
        })
      } else {
        matchedIds.add(session.id)
        const updates: Record<string, any> = {}
        if (session.recurring_template_id !== template.id) updates.recurring_template_id = template.id
        if (session.start_time !== template.start_time) updates.start_time = template.start_time
        if (session.duration_minutes !== template.duration_minutes) updates.duration_minutes = template.duration_minutes
        if (session.class_type !== template.class_type) updates.class_type = template.class_type
        if (session.instructor_id !== template.instructor_id) updates.instructor_id = template.instructor_id
        if (session.capacity !== template.capacity && template.capacity >= session.spots_booked) {
          updates.capacity = template.capacity
        }
        if (Object.keys(updates).length > 0) {
          toUpdate.push({ id: session.id, updates })
        }
      }
    }
  }

  // Insert new sessions
  if (toInsert.length > 0) {
    const { error } = await supabase.from('class_sessions').insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update changed sessions
  for (const { id, updates } of toUpdate) {
    await supabase.from('class_sessions').update(updates).eq('id', id)
  }

  // Delete any recurring session that wasn't matched to a template this run and has no bookings
  const toDelete = existing
    .filter((s) => !matchedIds.has(s.id) && s.spots_booked === 0)
    .map((s) => s.id)

  if (toDelete.length > 0) {
    await supabase.from('class_sessions').delete().in('id', toDelete)
  }

  return NextResponse.json({ created: toInsert.length, deleted: toDelete.length })
}
