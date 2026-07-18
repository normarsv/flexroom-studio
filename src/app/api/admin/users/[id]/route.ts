import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, userId: null }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return { ok: profile?.is_admin === true, userId: user.id }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { ok } = await checkAdmin(supabase)
  if (!ok) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const updates: Record<string, any> = {}
  if ('is_admin' in body) updates.is_admin = body.is_admin
  if ('is_coach' in body) updates.is_coach = body.is_coach

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, email, full_name, is_admin, is_coach')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { ok, userId } = await checkAdmin(supabase)
  if (!ok) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (id === userId) return NextResponse.json({ error: 'No puedes quitarte el rol a ti mismo' }, { status: 400 })

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ is_admin: false, is_coach: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
