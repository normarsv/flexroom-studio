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

  const { content_es, content_en } = await request.json()

  const { data: existing } = await supabase.from('cancellation_policy').select('id').single()

  const op = existing
    ? supabase.from('cancellation_policy').update({ content_es, content_en, updated_at: new Date().toISOString() }).eq('id', existing.id)
    : supabase.from('cancellation_policy').insert({ content_es, content_en })

  const { error } = await op
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
