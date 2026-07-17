import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  return profile?.is_admin === true
}

export async function GET() {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()

  const {
    code,
    description,
    discount_type,
    discount_value,
    usage_limit,
    per_user_limit,
    applies_to,
    allowed_class_types,
    first_time_only,
    is_active,
    expires_at,
  } = body

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: code.toUpperCase(),
      description: description || null,
      discount_type,
      discount_value: Number(discount_value),
      usage_limit: usage_limit ? Number(usage_limit) : null,
      per_user_limit: per_user_limit ? Number(per_user_limit) : 1,
      applies_to,
      allowed_class_types: allowed_class_types && allowed_class_types.length > 0 ? allowed_class_types : null,
      first_time_only: !!first_time_only,
      is_active: is_active !== undefined ? is_active : true,
      expires_at: expires_at || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
