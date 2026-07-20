import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendBookingConfirmation } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { sessionId, userPackageId, useCredit, guestName, guestEmail } = body

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch session
  const { data: session } = await supabase
    .from('class_sessions')
    .select('*, instructor:instructors(*)')
    .eq('id', sessionId)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
  }

  if (session.status === 'cancelled') {
    return NextResponse.json({ error: 'Esta clase fue cancelada' }, { status: 400 })
  }

  const spotsLeft = session.capacity - session.spots_booked
  if (spotsLeft <= 0) {
    return NextResponse.json({ error: 'No hay lugares disponibles' }, { status: 400 })
  }

  // Check cancellation window (can't book less than 12h before)
  const sessionDateTime = new Date(`${session.date}T${session.start_time}`)
  if (sessionDateTime <= new Date()) {
    return NextResponse.json({ error: 'Esta clase ya comenzó' }, { status: 400 })
  }

  // Logged-in user booking
  if (user) {
    // Check if already booked
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .neq('status', 'cancelled')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Ya tienes una reserva para esta clase' }, { status: 400 })
    }

    // Credit booking
    if (useCredit) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credit_sessions')
        .eq('id', user.id)
        .single()

      if (!profile || profile.credit_sessions <= 0) {
        return NextResponse.json({ error: 'No tienes créditos disponibles' }, { status: 400 })
      }

      // Atomically claim the spot before inserting the booking
      const { data: claimed } = await supabase.rpc('claim_session_spot', { p_session_id: sessionId })
      if (!claimed) {
        return NextResponse.json({ error: 'No hay lugares disponibles' }, { status: 400 })
      }

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({ user_id: user.id, session_id: sessionId, user_package_id: null, status: 'confirmed' })
        .select().single()

      if (error) {
        await supabase.rpc('release_session_spot', { p_session_id: sessionId })
        return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 })
      }

      await supabase.from('profiles').update({ credit_sessions: profile.credit_sessions - 1 }).eq('id', user.id)

      const { data: prof } = await supabase.from('profiles').select('email, full_name').eq('id', user.id).single()
      if (prof) await sendBookingConfirmation({ to: prof.email, name: prof.full_name || prof.email, session }).catch(console.error)

      return NextResponse.json({ booking })
    }

    let userPackage = null

    if (userPackageId) {
      // Verify package ownership and compatibility
      const { data: pkg } = await supabase
        .from('user_packages')
        .select('*, package:packages(*)')
        .eq('id', userPackageId)
        .eq('user_id', user.id)
        .single()

      if (!pkg) {
        return NextResponse.json({ error: 'Membresía no válida' }, { status: 400 })
      }
      if (new Date(pkg.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Tu membresía ha vencido' }, { status: 400 })
      }
      if (pkg.sessions_remaining !== null && pkg.sessions_remaining <= 0) {
        return NextResponse.json({ error: 'No tienes sesiones disponibles' }, { status: 400 })
      }
      if (pkg.package?.allowed_class_types && !pkg.package.allowed_class_types.includes(session.class_type)) {
        return NextResponse.json({ error: 'Tu membresía no incluye este tipo de clase' }, { status: 400 })
      }
      userPackage = pkg
    }

    // Atomically claim the spot before inserting the booking
    const { data: claimed } = await supabase.rpc('claim_session_spot', { p_session_id: sessionId })
    if (!claimed) {
      return NextResponse.json({ error: 'No hay lugares disponibles' }, { status: 400 })
    }

    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        user_package_id: userPackageId || null,
        status: 'confirmed',
      })
      .select()
      .single()

    if (error) {
      await supabase.rpc('release_session_spot', { p_session_id: sessionId })
      return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 })
    }

    // Deduct session if using a package
    if (userPackage && userPackage.sessions_remaining !== null) {
      await supabase
        .from('user_packages')
        .update({ sessions_remaining: userPackage.sessions_remaining - 1 })
        .eq('id', userPackageId)
    }

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      await sendBookingConfirmation({
        to: profile.email,
        name: profile.full_name || profile.email,
        session,
      }).catch(console.error)
    }

    return NextResponse.json({ booking })
  }

  // Guest booking (individual session only, no package required)
  if (!guestName || !guestEmail) {
    return NextResponse.json({ error: 'Nombre y correo son requeridos' }, { status: 400 })
  }

  // Atomically claim the spot before inserting the booking
  const { data: claimed } = await supabase.rpc('claim_session_spot', { p_session_id: sessionId })
  if (!claimed) {
    return NextResponse.json({ error: 'No hay lugares disponibles' }, { status: 400 })
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      user_id: null,
      guest_name: guestName,
      guest_email: guestEmail,
      session_id: sessionId,
      user_package_id: null,
      status: 'confirmed',
    })
    .select()
    .single()

  if (error) {
    await supabase.rpc('release_session_spot', { p_session_id: sessionId })
    return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 })
  }

  await sendBookingConfirmation({
    to: guestEmail,
    name: guestName,
    session,
  }).catch(console.error)

  return NextResponse.json({ booking })
}
