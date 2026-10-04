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
  const sessions: any[] = []

  // Generate for next 14 days
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i)
    const dayOfWeek = getDay(date) // 0=Sunday
    const dateStr = format(date, 'yyyy-MM-dd')

    const dayTemplates = templates.filter((t) => t.day_of_week === dayOfWeek)

    for (const template of dayTemplates) {
      // Match by template ID + date to correctly handle template edits
      const { data: existing } = await supabase
        .from('class_sessions')
        .select('id, start_time, duration_minutes, class_type, instructor_id, capacity, spots_booked')
        .eq('date', dateStr)
        .eq('recurring_template_id', template.id)
        .maybeSingle()

      if (!existing) {
        sessions.push({
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
        // Sync all changed fields from template (skip capacity if it would overbook)
        const updates: Record<string, any> = {}
        if (existing.start_time !== template.start_time) updates.start_time = template.start_time
        if (existing.duration_minutes !== template.duration_minutes) updates.duration_minutes = template.duration_minutes
        if (existing.class_type !== template.class_type) updates.class_type = template.class_type
        if (existing.instructor_id !== template.instructor_id) updates.instructor_id = template.instructor_id
        if (existing.capacity !== template.capacity && template.capacity >= existing.spots_booked) {
          updates.capacity = template.capacity
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('class_sessions').update(updates).eq('id', existing.id)
        }
      }
    }
  }

  if (sessions.length > 0) {
    const { error } = await supabase.from('class_sessions').insert(sessions)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Delete recurring sessions whose template no longer exists or is inactive,
  // but only if they have no confirmed bookings (avoid deleting paid classes)
  const activeTemplateIds = templates.map((t) => t.id)
  const startStr = format(today, 'yyyy-MM-dd')
  const endStr = format(addDays(today, 13), 'yyyy-MM-dd')

  const { data: orphaned } = await supabase
    .from('class_sessions')
    .select('id, spots_booked')
    .eq('is_recurring', true)
    .gte('date', startStr)
    .lte('date', endStr)
    .not('recurring_template_id', 'in', `(${activeTemplateIds.join(',')})`)

  const toDelete = (orphaned || []).filter((s) => s.spots_booked === 0).map((s) => s.id)
  let deleted = 0
  if (toDelete.length > 0) {
    await supabase.from('class_sessions').delete().in('id', toDelete)
    deleted = toDelete.length
  }

  return NextResponse.json({ created: sessions.length, deleted })
}
