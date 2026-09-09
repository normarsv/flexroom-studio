import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { createAdminClient } from '@/lib/supabase/admin'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

function substitute(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#666;width:110px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#1a2e5c;font-weight:600;vertical-align:top;">${value}</td>
  </tr>`
}

function buildEmail({ heading, body, ctaLabel, ctaUrl }: {
  heading: string; body: string; ctaLabel?: string; ctaUrl?: string
}) {
  const cta = ctaLabel && ctaUrl
    ? `<div style="text-align:center;margin:28px 0;">
        <a href="${ctaUrl}" style="background:#1a2e5c;color:#F4EF71;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;display:inline-block;">
          ${ctaLabel}
        </a>
       </div>`
    : ''

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4ef;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="background:#1a2e5c;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:900;color:#F4EF71;letter-spacing:-0.5px;text-transform:lowercase;">flex room.</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1a2e5c;">${heading}</h1>
          ${body}
          ${cta}
          <hr style="border:none;border-top:1px solid #ebebeb;margin:28px 0 20px;">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
            Flex Room Studio · Crescencio Rosas 54, San Cristóbal de las Casas<br>
            <a href="https://www.flexroomstudio.com" style="color:#999;">flexroomstudio.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
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
    return `<table cellpadding="0" cellspacing="0" width="100%" style="background:#f5f4ef;border-radius:8px;padding:16px;margin:16px 0;">
      ${detailRow('Clase', 'Pilates Reformer')}
      ${detailRow('Fecha', SAMPLE_DATE_STR.split(' a las')[0])}
      ${detailRow('Hora', '09:00')}
      ${detailRow('Duración', '50 min')}
      ${detailRow('Instructor/a', 'Steph')}
    </table>`
  }
  if (type === 'package_confirmation') {
    return `<table cellpadding="0" cellspacing="0" width="100%" style="background:#f5f4ef;border-radius:8px;padding:16px;margin:16px 0;">
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
      l.trim() ? `<p style="color:#444;font-size:14px;margin:6px 0;">${l}</p>` : '<br/>'
    ).join('')
    html = buildEmail({
      heading,
      body: paragraphs + sampleDetailsTable(type),
      ctaLabel: type === 'package_confirmation' ? 'Reservar una clase' : 'Ver mis clases',
      ctaUrl: 'https://www.flexroomstudio.com/es/account',
    })
  } else {
    // Default previews
    if (type === 'booking_confirmation') {
      html = buildEmail({
        heading: '¡Tu reserva está confirmada!',
        body: `<p style="color:#444;font-size:14px;margin:0 0 16px;">Hola <strong>María</strong>, te esperamos en:</p>
               ${sampleDetailsTable(type)}
               <p style="color:#666;font-size:13px;margin:8px 0 0;">Si necesitas cancelar, hazlo con al menos 12 horas de anticipación desde tu cuenta.</p>`,
        ctaLabel: 'Ver mis clases',
        ctaUrl: 'https://www.flexroomstudio.com/es/account',
      })
    } else {
      html = buildEmail({
        heading: '¡Tu membresía está activa!',
        body: `<p style="color:#444;font-size:14px;margin:0 0 16px;">Hola <strong>María</strong>, tu membresía ha sido activada:</p>
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
