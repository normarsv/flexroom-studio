import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function GET() {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('waitlist')
    .select('id, email, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { subject, body } = await request.json()
  if (!subject || !body) return NextResponse.json({ error: 'Asunto y mensaje son requeridos' }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: waitlist } = await adminClient.from('waitlist').select('email')

  if (!waitlist || waitlist.length === 0) return NextResponse.json({ sent: 0 })

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  // Send in batches of 50 (Resend batch limit)
  let sent = 0
  const emails = waitlist.map((w: { email: string }) => w.email)
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50)
    await resend.batch.send(
      batch.map((email: string) => ({
        from: 'Flex Room Studio <reservas@flexroomstudio.com>',
        to: email,
        subject,
        html: body,
      }))
    )
    sent += batch.length
  }

  return NextResponse.json({ sent })
}
