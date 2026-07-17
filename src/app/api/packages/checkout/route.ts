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

  const { packageId, locale, couponCode } = await request.json()

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

  // Apply coupon discount if provided
  let finalPrice: number = pkg.price_mxn
  let appliedCouponId: string | undefined

  if (couponCode) {
    const validateRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode, context: 'packages', userId: user.id }),
    })
    const validateData = await validateRes.json()

    if (validateData.valid) {
      const { discount_type, discount_value, id } = validateData.coupon
      if (discount_type === 'percentage') {
        finalPrice = Math.round(pkg.price_mxn * (1 - discount_value / 100))
      } else {
        finalPrice = Math.max(0, pkg.price_mxn - discount_value)
      }
      appliedCouponId = id
    }
  }

  const metadata: Record<string, string> = {
    packageId,
    userId: user.id,
  }
  if (appliedCouponId) {
    metadata.couponId = appliedCouponId
  }

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
          unit_amount: finalPrice * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/account?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/packages`,
    customer_email: profile?.email,
    metadata,
  })

  return NextResponse.json({ url: session.url })
}
