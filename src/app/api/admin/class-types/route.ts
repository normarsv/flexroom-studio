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
  const { data, error } = await adminClient.from('class_types').select('*').order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name_es, name_en, color, price_mxn } = await request.json()
  if (!name_es) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  // Generate key from name_es: lowercase, spaces to underscore, strip accents
  const key = name_es
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')

  const adminClient = createAdminClient()

  // Get max sort_order
  const { data: existing } = await adminClient.from('class_types').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { data, error } = await adminClient
    .from('class_types')
    .insert({ key, name_es, name_en: name_en || name_es, color: color || '#868686', price_mxn: price_mxn || 150, sort_order: nextOrder })
    .select()
    .single()

  if (error) {
    if (error.message.includes('unique')) return NextResponse.json({ error: 'Ya existe un tipo con ese nombre' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
