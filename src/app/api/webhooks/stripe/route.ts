import { createAdminClient } from '@/lib/supabase/admin'
import { sendPackageConfirmation } from '@/lib/email'
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
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null

    const supabase = createAdminClient()

    if (classSessionId) {
      // Idempotency check — skip if booking already exists for this user+session
      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', userId)
        .eq('session_id', classSessionId)
        .neq('status', 'cancelled')
        .maybeSingle()

      if (!existing) {
        // Atomically claim the spot; no-op if class is full
        const { data: claimed } = await supabase.rpc('claim_session_spot', { p_session_id: classSessionId })

        if (claimed) {
          await supabase.from('bookings').insert({
            user_id: userId,
            session_id: classSessionId,
            user_package_id: null,
            status: 'confirmed',
          })
        }
      }
    } else if (packageId) {
      // Idempotency check — skip if this payment intent was already processed
      if (paymentIntentId) {
        const { data: existing } = await supabase
          .from('user_packages')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .maybeSingle()

        if (existing) {
          return NextResponse.json({ received: true })
        }
      }

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
          stripe_payment_intent_id: paymentIntentId,
        })

        // Send confirmation email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (profile) {
          await sendPackageConfirmation({
            to: profile.email,
            name: profile.full_name || profile.email,
            packageName: pkg.name_es,
            sessionsRemaining: pkg.session_count,
            expiresAt: expiresAt.toISOString(),
          }).catch(console.error)
        }
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
