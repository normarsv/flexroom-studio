import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { CLASS_TYPE_LABELS, SINGLE_SESSION_PRICES_MXN } from '@/lib/constants'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia' as const,
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { classSessionId, locale } = await request.json()

  const { data: session } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('id', classSessionId)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .single()

  const price = SINGLE_SESSION_PRICES_MXN[session.class_type]
  const label = CLASS_TYPE_LABELS[session.class_type as keyof typeof CLASS_TYPE_LABELS]
  const className = locale === 'es' ? label.es : label.en

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: `${className} — ${session.date} ${session.start_time.slice(0, 5)}`,
          },
          unit_amount: price * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/classes?booking=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/classes`,
    customer_email: profile?.email,
    metadata: {
      classSessionId,
      userId: user.id,
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
