import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { name, email, preferred_day, preferred_time, class_type, message } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'Nombre y correo son requeridos' }, { status: 400 })
  }

  const { error } = await supabase.from('class_requests').insert({
    name,
    email,
    preferred_day: preferred_day || null,
    preferred_time: preferred_time || null,
    class_type: class_type || null,
    message: message || null,
  })

  if (error) {
    return NextResponse.json({ error: 'Error al guardar la solicitud' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
