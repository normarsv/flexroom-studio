import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { full_name, email } = await request.json()
  const adminClient = createAdminClient()

  // Update auth user email if changed
  if (email) {
    const { error: authError } = await adminClient.auth.admin.updateUserById(id, { email })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Update profile
  const updates: Record<string, any> = {}
  if (full_name !== undefined) updates.full_name = full_name || null
  if (email) updates.email = email

  const { data, error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
