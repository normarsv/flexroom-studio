import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const resend = new Resend(process.env.RESEND_API_KEY)

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

  const classNames: Record<string, string> = {
    funcional: 'Entrenamiento Funcional',
    barre: 'Barre',
    pilates_reformer: 'Pilates Reformer',
    pilates_mat: 'Pilates Mat',
    reformer_restaurativo: 'Reformer Clásico Restaurativo',
  }

  const className = classNames[session.class_type] || session.class_type

  await resend.emails.send({
    from: 'Flex Room Studio <reservas@flexroomstudio.com>',
    to,
    subject: `Reserva confirmada: ${className}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a2e5c;">
        <h2 style="color: #1a2e5c;">¡Reserva confirmada! 🎉</h2>
        <p>Hola ${name},</p>
        <p>Tu reserva ha sido confirmada con los siguientes detalles:</p>
        <div style="background: #f5f0eb; padding: 16px; border-radius: 12px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Clase:</strong> ${className}</p>
          <p style="margin: 4px 0;"><strong>Fecha:</strong> ${dateStr}</p>
          <p style="margin: 4px 0;"><strong>Duración:</strong> ${session.duration_minutes} minutos</p>
          ${session.instructor ? `<p style="margin: 4px 0;"><strong>Instructora:</strong> ${session.instructor.name}</p>` : ''}
          <p style="margin: 4px 0;"><strong>Ubicación:</strong> Crescencio Rosas 54, Barrio de San Diego, San Cristóbal de las Casas</p>
        </div>
        <p style="font-size: 13px; color: #666;">Recuerda que puedes cancelar hasta 12 horas antes de la clase. Después de ese tiempo, la sesión se descontará de tu membresía.</p>
        <p>¡Te esperamos! 💙</p>
        <p style="color: #999; font-size: 12px;">— Equipo Flex Room Studio</p>
      </div>
    `,
  })
}
