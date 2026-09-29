import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

// POST { session_ids: string[], notes?: string }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { session_ids, notes } = await request.json()
  if (!session_ids?.length) return NextResponse.json({ error: 'No sessions provided' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('class_sessions')
    .update({
      instructor_paid_at: new Date().toISOString(),
      instructor_payment_notes: notes || null,
    })
    .in('id', session_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, count: session_ids.length })
}
