import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdminOrCoach(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin, is_coach').eq('id', user.id).single()
  return profile?.is_admin === true || profile?.is_coach === true
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  if (!(await checkAdminOrCoach(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { attended } = await request.json() // true | false | null

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('bookings')
    .update({ attended })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
