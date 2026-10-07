import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function getRole(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('is_admin, is_coach').eq('id', user.id).single()
  if (!profile) return null
  return { isAdmin: profile.is_admin === true, isCoach: profile.is_coach === true }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const role = await getRole(supabase)
  if (!role || (!role.isAdmin && !role.isCoach)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('bookings')
    .select('id, user_id, user_package_id, guest_name, guest_email, status, attended, payment_status, station, profile:profiles(full_name, email)')
    .eq('session_id', id)
    .eq('status', 'confirmed')
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bookings = data ?? []

  // Heal spots_booked if it's out of sync with actual confirmed bookings
  await adminClient
    .from('class_sessions')
    .update({ spots_booked: bookings.length })
    .eq('id', id)

  return NextResponse.json(bookings)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const role = await getRole(supabase)
  if (!role || !role.isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { user_id, guest_name, guest_email, payment_status, station, user_package_id } = await request.json()
  if (!payment_status || !['paid', 'pending'].includes(payment_status)) {
    return NextResponse.json({ error: 'Estado de pago requerido' }, { status: 400 })
  }
  if (!user_id && !guest_name) {
    return NextResponse.json({ error: 'Se requiere cliente o nombre de invitado' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Validate package if provided
  let validatedPackage: { id: string; sessions_remaining: number | null } | null = null
  if (user_package_id) {
    if (!user_id) return NextResponse.json({ error: 'Se requiere un cliente para usar membresía' }, { status: 400 })
    const { data: session } = await adminClient.from('class_sessions').select('class_type').eq('id', id).single()
    const { data: pkg } = await adminClient
      .from('user_packages')
      .select('id, sessions_remaining, expires_at, package:packages(allowed_class_types)')
      .eq('id', user_package_id)
      .eq('user_id', user_id)
      .single()
    if (!pkg) return NextResponse.json({ error: 'Membresía no válida para este cliente' }, { status: 400 })
    if (new Date((pkg as any).expires_at) < new Date()) return NextResponse.json({ error: 'La membresía está vencida' }, { status: 400 })
    if ((pkg as any).sessions_remaining !== null && (pkg as any).sessions_remaining <= 0) {
      return NextResponse.json({ error: 'La membresía no tiene sesiones disponibles' }, { status: 400 })
    }
    const allowed: string[] | null = (pkg as any).package?.allowed_class_types
    if (session && allowed && allowed.length > 0 && !allowed.includes(session.class_type)) {
      return NextResponse.json({ error: 'Esta membresía no aplica para este tipo de clase' }, { status: 400 })
    }
    validatedPackage = { id: pkg.id, sessions_remaining: (pkg as any).sessions_remaining }
  }

  // Check session status and capacity from actual booking count
  const [sessionRes, countRes] = await Promise.all([
    adminClient.from('class_sessions').select('status, capacity').eq('id', id).single(),
    adminClient.from('bookings').select('*', { count: 'exact', head: true }).eq('session_id', id).eq('status', 'confirmed'),
  ])

  if (sessionRes.error || !sessionRes.data) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  if (sessionRes.data.status === 'cancelled') return NextResponse.json({ error: 'La clase está cancelada' }, { status: 400 })

  const confirmedCount = countRes.count ?? 0
  const capacity = sessionRes.data.capacity

  if (confirmedCount >= capacity) return NextResponse.json({ error: 'La clase está llena' }, { status: 400 })

  // Check for duplicate booking if user_id given
  if (user_id) {
    const { data: existing } = await adminClient
      .from('bookings')
      .select('id')
      .eq('session_id', id)
      .eq('user_id', user_id)
      .eq('status', 'confirmed')
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Este cliente ya está registrado' }, { status: 409 })
  }

  const row: any = { session_id: id, status: 'confirmed', payment_status }
  if (user_id) row.user_id = user_id
  if (guest_name) row.guest_name = guest_name
  if (guest_email) row.guest_email = guest_email
  if (station) row.station = station
  if (validatedPackage) row.user_package_id = validatedPackage.id

  const { data: booking, error: insertError } = await adminClient
    .from('bookings')
    .insert(row)
    .select('id, user_id, user_package_id, guest_name, guest_email, status, attended, payment_status, station, profile:profiles(full_name, email)')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Deduct one session from the package (skip if unlimited)
  if (validatedPackage && validatedPackage.sessions_remaining !== null) {
    await adminClient
      .from('user_packages')
      .update({ sessions_remaining: validatedPackage.sessions_remaining - 1 })
      .eq('id', validatedPackage.id)
  }

  // Keep spots_booked in sync with actual confirmed count
  await adminClient
    .from('class_sessions')
    .update({ spots_booked: confirmedCount + 1 })
    .eq('id', id)

  return NextResponse.json(booking)
}
