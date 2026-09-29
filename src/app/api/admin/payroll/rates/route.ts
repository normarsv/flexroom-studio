import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

// GET — return all class types with instructor_rate_mxn + all overrides
export async function GET() {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [typesRes, overridesRes] = await Promise.all([
    supabase.from('class_types').select('*').order('sort_order'),
    supabase.from('instructor_rate_overrides').select('*'),
  ])

  return NextResponse.json({ classTypes: typesRes.data || [], overrides: overridesRes.data || [] })
}

// PATCH — update a global rate or upsert/delete an override
// Body: { type: 'global', class_type_id: string, rate: number }
//    or { type: 'override', instructor_id: string, class_type: string, rate: number | null }
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const admin = createAdminClient()

  if (body.type === 'global') {
    const { error } = await admin
      .from('class_types')
      .update({ instructor_rate_mxn: body.rate })
      .eq('id', body.class_type_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.type === 'override') {
    if (body.rate === null) {
      await admin
        .from('instructor_rate_overrides')
        .delete()
        .eq('instructor_id', body.instructor_id)
        .eq('class_type', body.class_type)
    } else {
      const { error } = await admin
        .from('instructor_rate_overrides')
        .upsert({ instructor_id: body.instructor_id, class_type: body.class_type, rate_mxn: body.rate }, { onConflict: 'instructor_id,class_type' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
