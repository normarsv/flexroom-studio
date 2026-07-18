import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { packageId } = await request.json()
  if (!packageId) return NextResponse.json({ error: 'packageId requerido' }, { status: 400 })

  const { data: pkg, error: pkgError } = await supabase
    .from('packages')
    .select('*')
    .eq('id', packageId)
    .single()

  if (pkgError || !pkg) return NextResponse.json({ error: 'Membresía no encontrada' }, { status: 404 })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + pkg.validity_days)

  const { data, error } = await supabase
    .from('user_packages')
    .insert({
      user_id: id,
      package_id: packageId,
      sessions_remaining: pkg.session_count,
      expires_at: expiresAt.toISOString(),
      purchased_at: new Date().toISOString(),
      stripe_payment_intent_id: null,
    })
    .select('*, package:packages(name_es)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
