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
      // Check if session already exists
      const { data: existing } = await supabase
        .from('class_sessions')
        .select('id')
        .eq('date', dateStr)
        .eq('start_time', template.start_time)
        .eq('class_type', template.class_type)
        .eq('instructor_id', template.instructor_id)
        .single()

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
      }
    }
  }

  if (sessions.length > 0) {
    const { error } = await supabase.from('class_sessions').insert(sessions)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ created: sessions.length })
}
