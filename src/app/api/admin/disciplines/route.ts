import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

// GET — list all disciplines
export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from('disciplines').select('*').order('sort_order')
  return NextResponse.json(data || [])
}

// POST — create a new discipline
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const admin = createAdminClient()

  // Get max sort_order
  const { data: existing } = await admin.from('disciplines').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await admin
    .from('disciplines')
    .insert({ ...body, sort_order: nextOrder })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
