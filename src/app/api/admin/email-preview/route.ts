import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildEmail, detailRow } from '@/lib/email'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

function substitute(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

const SAMPLE_SESSION = {
  date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
  start_time: '09:00:00',
  duration_minutes: 50,
  class_type: 'pilates_reformer',
  instructor: { name: 'Steph' },
}

const SAMPLE_DATE_STR = (() => {
  const d = format(parseISO(`${SAMPLE_SESSION.date}T${SAMPLE_SESSION.start_time}`), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
  return d.charAt(0).toUpperCase() + d.slice(1)
})()

const SAMPLE_VARS: Record<string, Record<string, string>> = {
  booking_confirmation: {
    name: 'María',
    className: 'Pilates Reformer',
    date: SAMPLE_DATE_STR,
    instructor: 'Steph',
    duration: '50',
  },
  package_confirmation: {
    name: 'María',
    packageName: 'MIXTO 8 sesiones',
    sessionsRemaining: '8',
    expiresAt: format(addDays(new Date(), 30), "d 'de' MMMM 'de' yyyy", { locale: es }),
  },
}

function sampleDetailsTable(type: string) {
  if (type === 'booking_confirmation') {
    return `<table cellpadding="0" cellspacing="0" width="100%"
      style="background:#f9f8f4;border-radius:10px;padding:16px 20px;margin:16px 0;border:1px solid #eeecea;">
      ${detailRow('Clase', 'Pilates Reformer')}
      ${detailRow('Fecha', SAMPLE_DATE_STR.split(' a las')[0])}
      ${detailRow('Hora', '09:00')}
      ${detailRow('Duración', '50 min')}
      ${detailRow('Instructor/a', 'Steph')}
    </table>`
  }
  if (type === 'package_confirmation') {
    return `<table cellpadding="0" cellspacing="0" width="100%"
      style="background:#f5f4ef;border-radius:8px;padding:16px;margin:16px 0;">
      ${detailRow('Membresía', 'MIXTO 8 sesiones')}
      ${detailRow('Sesiones', '8')}
      ${detailRow('Válida hasta', format(addDays(new Date(), 30), "d 'de' MMMM 'de' yyyy", { locale: es }))}
    </table>`
  }
  return ''
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) {
    return new NextResponse('No autorizado', { status: 401 })
  }

  const type = request.nextUrl.searchParams.get('type') || 'booking_confirmation'
  const adminClient = createAdminClient()
  const { data: template } = await adminClient.from('email_templates').select('*').eq('id', type).single()

  const vars = SAMPLE_VARS[type] || {}

  let html: string
  if (template) {
    const heading = substitute(template.subject_es, vars)
    const bodyText = substitute(template.body_es, vars)
    const paragraphs = bodyText.split('\n').map((l: string) =>
      l.trim() ? `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 10px;">${l}</p>` : ''
    ).join('')
    html = buildEmail({
      heading,
      body: paragraphs + sampleDetailsTable(type),
      ctaLabel: type === 'package_confirmation' ? 'Reservar una clase' : 'Ver mis clases',
      ctaUrl: 'https://www.flexroomstudio.com/es/account',
    })
  } else {
    if (type === 'booking_confirmation') {
      html = buildEmail({
        heading: '¡Tu reserva está confirmada!',
        body: `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">Hola <strong>María</strong>, te esperamos en:</p>
               ${sampleDetailsTable(type)}
               <p style="color:#888;font-size:13px;margin:8px 0 0;">Si necesitas cancelar, hazlo con al menos 12 horas de anticipación desde tu cuenta.</p>`,
        ctaLabel: 'Ver mis clases',
        ctaUrl: 'https://www.flexroomstudio.com/es/account',
      })
    } else {
      html = buildEmail({
        heading: '¡Tu membresía está activa!',
        body: `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">Hola <strong>María</strong>, tu membresía ha sido activada:</p>
               ${sampleDetailsTable(type)}`,
        ctaLabel: 'Reservar una clase',
        ctaUrl: 'https://www.flexroomstudio.com/es/classes',
      })
    }
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
