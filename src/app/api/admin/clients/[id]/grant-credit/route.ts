import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credit_sessions')
    .eq('id', id)
    .single()

  if (fetchError || !profile) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const { error } = await supabase
    .from('profiles')
    .update({ credit_sessions: profile.credit_sessions + 1 })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ credit_sessions: profile.credit_sessions + 1 })
}
