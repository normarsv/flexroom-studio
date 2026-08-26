import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { password } = await request.json()
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { error: authError } = await adminClient.auth.admin.updateUserById(id, { password })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
