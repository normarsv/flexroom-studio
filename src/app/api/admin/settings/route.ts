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
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { cancellation_hours_limit } = await request.json()

  const { error } = await supabase
    .from('studio_settings')
    .update({ cancellation_hours_limit })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
