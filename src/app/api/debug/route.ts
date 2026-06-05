import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const limit = new Date()
  limit.setDate(new Date().getDate() + 15)
  const limitStr = limit.toISOString().split('T')[0]

  const withJoin = await supabase
    .from('class_sessions')
    .select('*, instructor:instructors(*)')
    .gte('date', today)
    .lte('date', limitStr)
    .eq('status', 'scheduled')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  return NextResponse.json({
    today,
    limit: limitStr,
    count: withJoin.data?.length,
    error: withJoin.error,
    sample: withJoin.data?.slice(0, 3),
  })
}
