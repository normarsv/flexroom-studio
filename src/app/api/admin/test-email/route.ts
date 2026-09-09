import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_admin, email, full_name').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY no está configurado en las variables de entorno' }, { status: 500 })

  const { to } = await request.json()
  const resend = new Resend(apiKey)

  const { data, error } = await resend.emails.send({
    from: 'Flex Room Studio <reservas@flexroomstudio.com>',
    to: to || profile.email,
    subject: 'Prueba de correo — Flex Room Studio',
    html: `<p>Este es un correo de prueba enviado desde el panel de administración de Flex Room Studio.</p><p>Si recibes este mensaje, el sistema de correo está funcionando correctamente.</p>`,
  })

  if (error) {
    console.error('[test-email] Resend error:', error)
    return NextResponse.json({ error: error.message, detail: error }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: data?.id, sentTo: to || profile.email })
}
