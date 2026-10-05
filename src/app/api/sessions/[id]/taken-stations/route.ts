import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Public endpoint — returns only station numbers, no personal data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('bookings')
    .select('station')
    .eq('session_id', id)
    .eq('status', 'confirmed')
    .not('station', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const stations = (data ?? []).map((b: any) => b.station as number)
  return NextResponse.json({ stations })
}
