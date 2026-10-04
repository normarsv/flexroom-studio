import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const TEMP_PASSWORD = 'Flex2026!'
const MIXTO_12_PKG = 'dcffb2dc-a2f9-43d8-9685-d21489808195'

async function main() {
  const email = 'camiwis.carrasco21@gmail.com'
  const full_name = 'Camila Naomi Carrasco Cruz'

  const { data, error } = await supabase.auth.admin.createUser({
    email, password: TEMP_PASSWORD, email_confirm: true,
    user_metadata: { full_name },
  })

  let userId: string
  if (error) {
    if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('exists')) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const existing = list?.users?.find(u => u.email?.toLowerCase() === email)
      if (!existing) { console.error('Error:', error.message); return }
      userId = existing.id
      console.log('Auth ya existe:', userId)
    } else { console.error('Auth error:', error.message); return }
  } else {
    userId = data.user.id
    console.log('✓ Auth creado:', userId)
  }

  await supabase.from('profiles').upsert({
    id: userId, email, full_name, phone: null, lifetime_value: 7000,
  }, { onConflict: 'id' })
  console.log('✓ Profile (lifetime_value: $7,000)')

  const { data: existingPkg } = await supabase.from('user_packages').select('id')
    .eq('user_id', userId).eq('package_id', MIXTO_12_PKG).maybeSingle()

  if (existingPkg) { console.log('↩ Package ya existe'); return }

  const { error: pkgErr } = await supabase.from('user_packages').insert({
    user_id: userId,
    package_id: MIXTO_12_PKG,
    sessions_remaining: 4,
    expires_at: '2026-10-08T18:35:00Z',
    stripe_payment_intent_id: null,
  })
  if (pkgErr) { console.error('Package error:', pkgErr.message); return }
  console.log('✓ Package: Mixto 12 Sesiones — 4 restantes, vence oct 8')
}

main().catch(console.error)
