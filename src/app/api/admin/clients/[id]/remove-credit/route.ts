import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const { classType, quantity = 1 } = await request.json()
  if (!classType) return NextResponse.json({ error: 'Tipo de clase requerido' }, { status: 400 })
  const qty = Math.max(1, Math.min(50, parseInt(quantity, 10) || 1))

  const adminClient = createAdminClient()

  // Find unused credits of this type for this user, limited to qty
  const { data: credits, error: fetchError } = await adminClient
    .from('credits')
    .select('id')
    .eq('user_id', id)
    .eq('class_type', classType)
    .eq('used', false)
    .limit(qty)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!credits || credits.length === 0) return NextResponse.json({ error: 'No hay créditos de ese tipo para quitar' }, { status: 400 })

  const ids = credits.map((c) => c.id)
  const { error: deleteError } = await adminClient.from('credits').delete().in('id', ids)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ removed: ids.length })
}
