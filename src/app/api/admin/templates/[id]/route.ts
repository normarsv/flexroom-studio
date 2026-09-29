import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()

  // Fetch current template so we can detect capacity changes
  const { data: current } = await supabase
    .from('recurring_templates')
    .select('capacity')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('recurring_templates')
    .update(body)
    .eq('id', id)
    .select('*, instructor:instructors(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If capacity changed, sync future sessions generated from this template
  if (body.capacity !== undefined && current && body.capacity !== current.capacity) {
    const today = new Date().toISOString().slice(0, 10)
    // Only update sessions where spots_booked <= new capacity (never overbook)
    await supabase
      .from('class_sessions')
      .update({ capacity: body.capacity })
      .eq('recurring_template_id', id)
      .gte('date', today)
      .lte('spots_booked', body.capacity)
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase.from('recurring_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
