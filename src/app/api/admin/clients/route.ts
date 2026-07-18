import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const { full_name, email } = await request.json()
  if (!email) return NextResponse.json({ error: 'El correo es requerido' }, { status: 400 })

  const adminClient = createAdminClient()

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name || null },
  })

  if (inviteError) {
    if (inviteError.message.includes('already been registered')) {
      return NextResponse.json({ error: 'Este correo ya está registrado' }, { status: 409 })
    }
    console.error('invite error:', inviteError)
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  const userId = invited.user.id

  // Upsert with explicit conflict target so it always updates if the row already exists
  // (a DB trigger may have already created the profile row)
  const { data: profile, error: upsertError } = await adminClient
    .from('profiles')
    .upsert(
      { id: userId, email, full_name: full_name || null, is_admin: false, credit_sessions: 0 },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (upsertError) {
    console.error('profile upsert error:', upsertError)
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // If upsert returned null for any reason, fall back to a plain select
  if (!profile) {
    const { data: existing, error: selectError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (selectError || !existing) {
      console.error('profile select fallback error:', selectError)
      return NextResponse.json({ error: 'No se pudo guardar el perfil del cliente' }, { status: 500 })
    }

    return NextResponse.json({ ...existing, user_packages: [], bookings: [] })
  }

  return NextResponse.json({ ...profile, user_packages: [], bookings: [] })
}
