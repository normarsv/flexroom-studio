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
    const { packageId, userId, classSessionId, couponId } = session.metadata!

    const supabase = await createClient()

    if (classSessionId) {
      // Single-session booking paid via Stripe
      const { data: classSession } = await supabase
        .from('class_sessions')
        .select('spots_booked')
        .eq('id', classSessionId)
        .single()

      if (classSession) {
        await supabase.from('bookings').insert({
          user_id: userId,
          session_id: classSessionId,
          user_package_id: null,
          status: 'confirmed',
        })

        await supabase
          .from('class_sessions')
          .update({ spots_booked: classSession.spots_booked + 1 })
          .eq('id', classSessionId)
      }
    } else if (packageId) {
      // Package purchase
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
          sessions_remaining: pkg.session_count,
          expires_at: expiresAt.toISOString(),
        })
      }
    }

    // Record coupon use and increment usage_count
    if (couponId) {
      await supabase.from('coupon_uses').insert({
        coupon_id: couponId,
        user_id: userId || null,
        guest_email: null,
      })

      const { data: couponRow } = await supabase
        .from('coupons')
        .select('usage_count')
        .eq('id', couponId)
        .single()

      if (couponRow) {
        await supabase
          .from('coupons')
          .update({ usage_count: couponRow.usage_count + 1 })
          .eq('id', couponId)
      }
    }
  }

  return NextResponse.json({ received: true })
}
