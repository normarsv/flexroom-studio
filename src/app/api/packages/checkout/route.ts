import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia' as const,
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { packageId, locale } = await request.json()

  const { data: pkg } = await supabase
    .from('packages')
    .select('*')
    .eq('id', packageId)
    .eq('is_active', true)
    .single()

  if (!pkg) {
    return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .single()

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: pkg.name_es,
            description: pkg.description_es,
          },
          unit_amount: pkg.price_mxn * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/account?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/packages`,
    customer_email: profile?.email,
    metadata: {
      packageId,
      userId: user.id,
    },
  })

  return NextResponse.json({ url: session.url })
}
