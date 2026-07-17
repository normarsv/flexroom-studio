import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { code, context, userId, guestEmail, classType } = await request.json()

  if (!code || !context) {
    return NextResponse.json({ valid: false, error: 'Cupón no válido' })
  }

  // 1. Find coupon by code (case-insensitive)
  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code)
    .single()

  if (!coupon) {
    return NextResponse.json({ valid: false, error: 'Cupón no válido' })
  }

  // 2. Check is_active and not expired
  if (!coupon.is_active) {
    return NextResponse.json({ valid: false, error: 'Este cupón ya no está disponible' })
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Este cupón ya no está disponible' })
  }

  // 3. Check applies_to matches context
  if (coupon.applies_to !== 'both' && coupon.applies_to !== context) {
    return NextResponse.json({ valid: false, error: 'Este cupón no aplica para esta compra' })
  }

  // 4. Check allowed_class_types when context is 'classes'
  if (context === 'classes' && coupon.allowed_class_types && coupon.allowed_class_types.length > 0) {
    if (!classType || !coupon.allowed_class_types.includes(classType)) {
      return NextResponse.json({ valid: false, error: 'Este cupón no aplica para esta compra' })
    }
  }

  // 5. Check usage_limit
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
    return NextResponse.json({ valid: false, error: 'Este cupón ha alcanzado su límite de usos' })
  }

  // 6. Check first_time_only
  if (coupon.first_time_only && userId) {
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('status', 'cancelled')

    if (count && count > 0) {
      // Also check user_packages (package purchases = returning customer)
      const { count: pkgCount } = await supabase
        .from('user_packages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if ((count && count > 0) || (pkgCount && pkgCount > 0)) {
        return NextResponse.json({ valid: false, error: 'Este cupón es solo para nuevos clientes' })
      }
    }
  }

  // 7. Check per_user_limit
  if (userId || guestEmail) {
    let query = supabase
      .from('coupon_uses')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)

    if (userId && guestEmail) {
      query = query.or(`user_id.eq.${userId},guest_email.eq.${guestEmail}`)
    } else if (userId) {
      query = query.eq('user_id', userId)
    } else if (guestEmail) {
      query = query.eq('guest_email', guestEmail)
    }

    const { count: useCount } = await query

    if (useCount !== null && useCount >= coupon.per_user_limit) {
      return NextResponse.json({ valid: false, error: 'Ya usaste este cupón el máximo de veces permitidas' })
    }
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      description: coupon.description,
    },
  })
}
