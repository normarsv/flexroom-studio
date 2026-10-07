import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!(await checkAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const classType = request.nextUrl.searchParams.get('class_type')
  if (!classType) return NextResponse.json({ error: 'class_type requerido' }, { status: 400 })

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await adminClient
    .from('user_packages')
    .select('id, sessions_remaining, expires_at, package:packages(name_es, allowed_class_types)')
    .eq('user_id', id)
    .gt('expires_at', now)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter to packages that cover this class type
  const valid = (data ?? []).filter((up: any) => {
    const allowed: string[] | null = up.package?.allowed_class_types
    if (!allowed || allowed.length === 0) return true
    return allowed.includes(classType)
  })

  // Sessions remaining > 0 or null (unlimited). Sort: fewest sessions first, unlimited last.
  const usable = valid.filter((up: any) => up.sessions_remaining === null || up.sessions_remaining > 0)

  usable.sort((a: any, b: any) => {
    if (a.sessions_remaining === null && b.sessions_remaining === null) return 0
    if (a.sessions_remaining === null) return 1
    if (b.sessions_remaining === null) return -1
    return a.sessions_remaining - b.sessions_remaining
  })

  return NextResponse.json(usable)
}
