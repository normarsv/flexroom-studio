import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Returns the logged-in user's booking state for the classes page.
// Called client-side so the page itself can be statically cached.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      userId: null,
      userPackages: [],
      bookedSessionIds: [],
      waitlistedSessionIds: [],
      credits: [],
      hasAcceptedWaiver: false,
    })
  }

  const now = new Date().toISOString()

  const [packagesRes, bookingsRes, creditsRes, waiverRes] = await Promise.all([
    supabase
      .from('user_packages')
      .select('*, package:packages(*)')
      .eq('user_id', user.id)
      .gt('expires_at', now)
      .or('sessions_remaining.gt.0,sessions_remaining.is.null'),
    supabase
      .from('bookings')
      .select('session_id, status')
      .eq('user_id', user.id)
      .neq('status', 'cancelled'),
    supabase
      .from('credits')
      .select('id, class_type')
      .eq('user_id', user.id)
      .eq('used', false),
    supabase
      .from('user_waivers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return NextResponse.json({
    userId: user.id,
    userPackages: packagesRes.data || [],
    bookedSessionIds: (bookingsRes.data || [])
      .filter((b: any) => b.status === 'confirmed')
      .map((b: any) => b.session_id),
    waitlistedSessionIds: (bookingsRes.data || [])
      .filter((b: any) => b.status === 'waitlist')
      .map((b: any) => b.session_id),
    credits: creditsRes.data || [],
    hasAcceptedWaiver: !!waiverRes.data,
  })
}
