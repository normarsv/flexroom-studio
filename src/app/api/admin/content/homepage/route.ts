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

  const body = await request.json()

  const { data: existing } = await supabase.from('homepage_content').select('id').single()

  const op = existing
    ? supabase.from('homepage_content').update({ ...body, updated_at: new Date().toISOString() }).eq('id', existing.id)
    : supabase.from('homepage_content').insert(body)

  const { error } = await op
  if (error) { console.error('DB error:', error); return NextResponse.json({ error: error.message }, { status: 500 }) }
  return NextResponse.json({ success: true })
}
