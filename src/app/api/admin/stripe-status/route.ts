import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  return NextResponse.json({
    testKeySet: !!process.env.STRIPE_SECRET_KEY_TEST,
    liveKeySet: !!process.env.STRIPE_SECRET_KEY_LIVE,
    testWebhookSet: !!process.env.STRIPE_WEBHOOK_SECRET_TEST,
    liveWebhookSet: !!process.env.STRIPE_WEBHOOK_SECRET_LIVE,
  })
}
