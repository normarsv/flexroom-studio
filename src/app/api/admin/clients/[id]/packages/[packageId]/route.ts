import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const { packageId } = await params
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, any> = {}
  if (body.sessions_remaining !== undefined) updates.sessions_remaining = body.sessions_remaining
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at

  const { data, error } = await supabase
    .from('user_packages')
    .update(updates)
    .eq('id', packageId)
    .select('*, package:packages(name_es)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const { packageId } = await params
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('user_packages')
    .delete()
    .eq('id', packageId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
