import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const { station, action } = await request.json()
  if (!station || station < 1 || station > 8 || !['block', 'unblock'].includes(action)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: session } = await adminClient
    .from('class_sessions')
    .select('blocked_stations')
    .eq('id', id)
    .single()

  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  const current: number[] = session.blocked_stations || []
  const updated =
    action === 'block'
      ? current.includes(station) ? current : [...current, station]
      : current.filter((s: number) => s !== station)

  const { error } = await adminClient
    .from('class_sessions')
    .update({ blocked_stations: updated })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ blocked_stations: updated })
}
