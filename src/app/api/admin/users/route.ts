import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function GET() {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name, is_admin, is_coach')
    .or('is_admin.eq.true,is_coach.eq.true')
    .order('full_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { email, full_name, role } = await request.json()
  if (!email || !role) return NextResponse.json({ error: 'Correo y rol son requeridos' }, { status: 400 })

  const adminClient = createAdminClient()

  // Check if user already exists in profiles
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id, is_admin, is_coach')
    .eq('email', email)
    .single()

  if (existing) {
    // User exists — just update their role
    const updates = {
      is_admin: role === 'admin' ? true : existing.is_admin,
      is_coach: role === 'coach' ? true : existing.is_coach,
      ...(full_name ? { full_name } : {}),
    }
    const { data, error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', existing.id)
      .select('id, email, full_name, is_admin, is_coach')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // New user — invite them
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name || null },
  })

  if (inviteError) {
    console.error('invite error:', inviteError)
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  const userId = invited.user.id
  const { data: profile, error: upsertError } = await adminClient
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        full_name: full_name || null,
        is_admin: role === 'admin',
        is_coach: role === 'coach',
        credit_sessions: 0,
      },
      { onConflict: 'id' }
    )
    .select('id, email, full_name, is_admin, is_coach')
    .single()

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })
  return NextResponse.json(profile)
}
