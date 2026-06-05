import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia' as const,
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { packageId, userId } = session.metadata!

    const supabase = await createClient()

    const { data: pkg } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (pkg) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + pkg.validity_days)

      await supabase.from('user_packages').insert({
        user_id: userId,
        package_id: packageId,
        sessions_remaining: pkg.session_count, // null = unlimited
        expires_at: expiresAt.toISOString(),
        stripe_payment_intent_id: session.payment_intent as string,
      })
    }
  }

  return NextResponse.json({ received: true })
}
