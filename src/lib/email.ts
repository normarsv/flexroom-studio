import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { createAdminClient } from './supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

const CLASS_NAMES: Record<string, string> = {
  funcional: 'Entrenamiento Funcional',
  barre: 'Barre',
  pilates_reformer: 'Pilates Reformer',
  pilates_mat: 'Pilates Mat',
  reformer_restaurativo: 'Reformer Clásico Restaurativo',
}

function substitute(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

function buildEmail({
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: {
  heading: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
}) {
  const cta = ctaLabel && ctaUrl
    ? `<div style="text-align:center;margin:32px 0 8px;">
        <a href="${ctaUrl}"
           style="background:#1e1e1e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:13px 32px;border-radius:8px;display:inline-block;letter-spacing:0.2px;">
          ${ctaLabel}
        </a>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4ef;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

        <!-- Logo -->
        <tr>
          <td style="padding:0 0 20px;text-align:center;">
            <p style="margin:0;font-size:20px;font-weight:900;color:#1e1e1e;letter-spacing:-0.5px;text-transform:lowercase;">flex room.</p>
            <div style="width:32px;height:3px;background:#F4EF71;margin:8px auto 0;border-radius:2px;"></div>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:16px;padding:36px 36px 28px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
            <h1 style="margin:0 0 20px;font-size:19px;font-weight:700;color:#1e1e1e;line-height:1.3;">${heading}</h1>
            ${body}
            ${cta}
            <hr style="border:none;border-top:1px solid #f0efea;margin:28px 0 20px;">
            <p style="margin:0;font-size:12px;color:#aaa;line-height:1.7;">
              Flex Room Studio · Crescencio Rosas 54, San Cristóbal de las Casas<br>
              <a href="https://www.flexroomstudio.com" style="color:#aaa;text-decoration:none;">flexroomstudio.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#666;width:110px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#1a2e5c;font-weight:600;vertical-align:top;">${value}</td>
  </tr>`
}

function sessionDetails(session: BookingEmailParams['session'], className: string) {
  const sessionDate = parseISO(`${session.date}T${session.start_time}`)
  const dateStr = format(sessionDate, "EEEE d 'de' MMMM", { locale: es })
  const timeStr = format(sessionDate, 'HH:mm')

  const rows = [
    detailRow('Clase', className),
    detailRow('Fecha', dateStr.charAt(0).toUpperCase() + dateStr.slice(1)),
    detailRow('Hora', timeStr),
    detailRow('Duración', `${session.duration_minutes} min`),
    ...(session.instructor?.name ? [detailRow('Instructor/a', session.instructor.name)] : []),
  ].join('')

  return `<table cellpadding="0" cellspacing="0" width="100%"
    style="background:#f9f8f4;border-radius:10px;padding:16px 20px;margin:16px 0;border:1px solid #eeecea;">
    ${rows}
  </table>`
}

async function fetchTemplate(id: string) {
  const supabase = createAdminClient()
  const { data } = await supabase.from('email_templates').select('*').eq('id', id).single()
  return data
}

export interface BookingEmailParams {
  to: string
  name: string
  session: {
    date: string
    start_time: string
    duration_minutes: number
    class_type: string
    instructor?: { name: string } | null
    event_title?: string | null
  }
}

// ── Booking confirmation ─────────────────────────────────────────────────────

export async function sendBookingConfirmation({ to, name, session }: BookingEmailParams) {
  const className = (session as any).event_title || CLASS_NAMES[session.class_type] || session.class_type
  const sessionDate = parseISO(`${session.date}T${session.start_time}`)
  const dateStr = format(sessionDate, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })

  const vars = {
    name,
    className,
    date: dateStr,
    instructor: session.instructor?.name ?? '',
    duration: String(session.duration_minutes),
  }

  const template = await fetchTemplate('booking_confirmation')
  const subject = template
    ? substitute(template.subject_es, vars)
    : `Reserva confirmada: ${className}`

  let html: string
  if (template) {
    // Template body already contains the greeting — don't prepend another one
    const bodyText = substitute(template.body_es, vars)
    const paragraphs = bodyText.split('\n').map((l: string) =>
      l.trim() ? `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 10px;">${l}</p>` : ''
    ).join('')
    html = buildEmail({
      heading: '¡Tu reserva está confirmada!',
      body: paragraphs + sessionDetails(session, className),
      ctaLabel: 'Ver mis clases',
      ctaUrl: 'https://www.flexroomstudio.com/es/account',
    })
  } else {
    html = buildEmail({
      heading: '¡Tu reserva está confirmada!',
      body: `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">Hola <strong>${name}</strong>, te esperamos en:</p>
             ${sessionDetails(session, className)}
             <p style="color:#888;font-size:13px;margin:8px 0 0;">Si necesitas cancelar, hazlo con al menos 12 horas de anticipación desde tu cuenta.</p>`,
      ctaLabel: 'Ver mis clases',
      ctaUrl: 'https://www.flexroomstudio.com/es/account',
    })
  }

  const { data, error } = await resend.emails.send({
    from: 'Flex Room Studio <reservas@flexroomstudio.com>',
    to,
    subject,
    html,
  })
  if (error) {
    console.error('[email] sendBookingConfirmation failed:', error, { to, subject })
    throw error
  }
  return data
}

// ── Booking cancellation confirmation ────────────────────────────────────────

export async function sendCancellationConfirmation({
  to,
  name,
  session,
  creditGranted,
}: BookingEmailParams & { creditGranted: boolean }) {
  const className = (session as any).event_title || CLASS_NAMES[session.class_type] || session.class_type
  const sessionDate = parseISO(`${session.date}T${session.start_time}`)
  const dateStr = format(sessionDate, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })

  const creditNote = creditGranted
    ? `<p style="background:#edf7ed;border-left:3px solid #4caf50;padding:10px 14px;font-size:13px;color:#2e7d32;border-radius:0 6px 6px 0;margin:16px 0 0;">
        Se ha devuelto un crédito a tu cuenta para que puedas reservar otra clase.
       </p>`
    : `<p style="background:#fff3e0;border-left:3px solid #ff9800;padding:10px 14px;font-size:13px;color:#e65100;border-radius:0 6px 6px 0;margin:16px 0 0;">
        La cancelación fue fuera del plazo permitido, por lo que no se generó un crédito.
       </p>`

  const html = buildEmail({
    heading: 'Tu reserva fue cancelada',
    body: `<p style="color:#444;font-size:14px;margin:0 0 16px;">Hola <strong>${name}</strong>, confirmamos que tu reserva para el ${dateStr} ha sido cancelada.</p>
           ${sessionDetails(session, className)}
           ${creditNote}`,
    ctaLabel: 'Ver mis clases',
    ctaUrl: 'https://www.flexroomstudio.com/es/account',
  })

  const { error } = await resend.emails.send({
    from: 'Flex Room Studio <reservas@flexroomstudio.com>',
    to,
    subject: `Cancelación confirmada: ${className} · ${format(sessionDate, "d MMM", { locale: es })}`,
    html,
  })
  if (error) console.error('[email] sendCancellationConfirmation failed:', error, { to })
}

// ── Session cancelled by admin (notify all booked clients) ──────────────────

export async function sendSessionCancelledNotification({ to, name, session }: BookingEmailParams) {
  const className = (session as any).event_title || CLASS_NAMES[session.class_type] || session.class_type
  const sessionDate = parseISO(`${session.date}T${session.start_time}`)

  const html = buildEmail({
    heading: 'Clase cancelada',
    body: `<p style="color:#444;font-size:14px;margin:0 0 16px;">Hola <strong>${name}</strong>, lamentamos informarte que la siguiente clase fue cancelada:</p>
           ${sessionDetails(session, className)}
           <p style="color:#666;font-size:13px;margin:8px 0 0;">Si tenías una reserva, el crédito o sesión ha sido devuelto a tu cuenta automáticamente. Disculpa los inconvenientes.</p>`,
    ctaLabel: 'Reservar otra clase',
    ctaUrl: 'https://www.flexroomstudio.com/es/classes',
  })

  const { error: e2 } = await resend.emails.send({
    from: 'Flex Room Studio <reservas@flexroomstudio.com>',
    to,
    subject: `Clase cancelada: ${className} · ${format(sessionDate, "d MMM 'a las' HH:mm", { locale: es })}`,
    html,
  })
  if (e2) console.error('[email] sendSessionCancelledNotification failed:', e2, { to })
}

// ── Waitlist promotion ───────────────────────────────────────────────────────

export async function sendWaitlistPromotion({ to, name, session }: BookingEmailParams) {
  const className = (session as any).event_title || CLASS_NAMES[session.class_type] || session.class_type
  const sessionDate = parseISO(`${session.date}T${session.start_time}`)
  const dateStr = format(sessionDate, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })

  const html = buildEmail({
    heading: '¡Se liberó un lugar para ti!',
    body: `<p style="color:#444;font-size:14px;margin:0 0 16px;">Hola <strong>${name}</strong>, ¡buenas noticias! Se liberó un lugar en:</p>
           ${sessionDetails(session, className)}
           <p style="color:#444;font-size:14px;margin:8px 0 0;">Tu reserva ya está confirmada. ¡Te esperamos!</p>`,
    ctaLabel: 'Ver mis clases',
    ctaUrl: 'https://www.flexroomstudio.com/es/account',
  })

  const { error: e3 } = await resend.emails.send({
    from: 'Flex Room Studio <reservas@flexroomstudio.com>',
    to,
    subject: `¡Lugar disponible! ${className} — ${dateStr}`,
    html,
  })
  if (e3) console.error('[email] sendWaitlistPromotion failed:', e3, { to })
}

// ── Package purchase confirmation ────────────────────────────────────────────

interface PackageEmailParams {
  to: string
  name: string
  packageName: string
  sessionsRemaining: number | null
  expiresAt: string
}

export async function sendPackageConfirmation({ to, name, packageName, sessionsRemaining, expiresAt }: PackageEmailParams) {
  const expiresDate = format(new Date(expiresAt), "d 'de' MMMM 'de' yyyy", { locale: es })
  const sessionsText = sessionsRemaining === null ? 'Ilimitadas' : String(sessionsRemaining)

  const vars = { name, packageName, sessionsRemaining: sessionsText, expiresAt: expiresDate }

  const template = await fetchTemplate('package_confirmation')
  const subject = template
    ? substitute(template.subject_es, vars)
    : `¡Tu membresía está activa! ${packageName}`

  const details = `<table cellpadding="0" cellspacing="0" width="100%"
      style="background:#f5f4ef;border-radius:8px;padding:16px;margin:16px 0;">
      ${detailRow('Membresía', packageName)}
      ${detailRow('Sesiones', sessionsText)}
      ${detailRow('Válida hasta', expiresDate)}
    </table>`

  let html: string
  if (template) {
    const bodyText = substitute(template.body_es, vars)
    const paragraphs = bodyText.split('\n').map((l: string) =>
      l.trim() ? `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 10px;">${l}</p>` : ''
    ).join('')
    html = buildEmail({
      heading: '¡Tu membresía está activa!',
      body: paragraphs + details,
      ctaLabel: 'Reservar una clase',
      ctaUrl: 'https://www.flexroomstudio.com/es/classes',
    })
  } else {
    html = buildEmail({
      heading: '¡Tu membresía está activa!',
      body: `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">Hola <strong>${name}</strong>, tu membresía ha sido activada:</p>
             ${details}
             <p style="color:#888;font-size:13px;">Ya puedes reservar tus clases en la app.</p>`,
      ctaLabel: 'Reservar una clase',
      ctaUrl: 'https://www.flexroomstudio.com/es/classes',
    })
  }

  const { error: e4 } = await resend.emails.send({
    from: 'Flex Room Studio <reservas@flexroomstudio.com>',
    to,
    subject,
    html,
  })
  if (e4) console.error('[email] sendPackageConfirmation failed:', e4, { to, subject })
}
