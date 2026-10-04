import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('studio_settings')
    .select('waiver_text')
    .eq('id', 1)
    .single()

  return NextResponse.json({ text: data?.waiver_text ?? null })
}
