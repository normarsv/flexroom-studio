import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { createAdminClient } from './supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

const classNames: Record<string, string> = {
  funcional: 'Entrenamiento Funcional',
  barre: 'Barre',
  pilates_reformer: 'Pilates Reformer',
  pilates_mat: 'Pilates Mat',
  reformer_restaurativo: 'Reformer Clásico Restaurativo',
}

function substitute(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

function wrapInHtml(body: string) {
  const lines = body
    .split('\n')
    .map((l) => (l.trim() ? `<p style="margin: 6px 0;">${l}</p>` : '<br/>'))
    .join('')
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a2e5c;">
      ${lines}
      <p style="color: #999; font-size: 12px; margin-top: 24px;">— Equipo Flex Room Studio</p>
    </div>
  `
}

async function fetchTemplate(id: string) {
  const supabase = createAdminClient()
  const { data } = await supabase.from('email_templates').select('*').eq('id', id).single()
  return data
}

interface BookingEmailParams {
  to: string
  name: string
  session: {
    date: string
    start_time: string
    duration_minutes: number
    class_type: string
    instructor?: { name: string } | null
  }
}

export async function sendBookingConfirmation({ to, name, session }: BookingEmailParams) {
  const sessionDate = parseISO(`${session.date}T${session.start_time}`)
  const dateStr = format(sessionDate, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
  const className = classNames[session.class_type] || session.class_type

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
  const bodyText = template
    ? substitute(template.body_es, vars)
    : `Hola ${name},\n\nTu reserva para ${className} el ${dateStr} está confirmada.\n\n¡Te esperamos!\nflex room.`

  await resend.emails.send({
    from: 'Flex Room Studio <reservas@flexroomstudio.com>',
    to,
    subject,
    html: wrapInHtml(bodyText),
  })
}

interface PackageEmailParams {
  to: string
  name: string
  packageName: string
  sessionsRemaining: number | null
  expiresAt: string
}

export async function sendPackageConfirmation({ to, name, packageName, sessionsRemaining, expiresAt }: PackageEmailParams) {
  const expiresDate = format(new Date(expiresAt), "d 'de' MMMM 'de' yyyy", { locale: es })
  const sessionsText = sessionsRemaining === null ? 'ilimitadas' : String(sessionsRemaining)

  const vars = {
    name,
    packageName,
    sessionsRemaining: sessionsText,
    expiresAt: expiresDate,
  }

  const template = await fetchTemplate('package_confirmation')
  const subject = template
    ? substitute(template.subject_es, vars)
    : `Tu membresía está activa: ${packageName}`
  const bodyText = template
    ? substitute(template.body_es, vars)
    : `Hola ${name},\n\nTu membresía ${packageName} está activa. Tienes ${sessionsText} sesiones disponibles hasta el ${expiresDate}.\n\nReserva tus clases en flexroomstudio.com\n\n¡A moverse!\nflex room.`

  await resend.emails.send({
    from: 'Flex Room Studio <reservas@flexroomstudio.com>',
    to,
    subject,
    html: wrapInHtml(bodyText),
  })
}
