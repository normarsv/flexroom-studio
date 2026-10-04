import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MIGRATED_EMAILS = [
  'bla.pal.hdz@gmail.com',
  'patyov@hotmail.com',
  'valentina.auletta@gmail.com',
  'athenas1999@gmail.com',
  'dilanaor08@gmail.com',
  'estherlazos@gmail.com',
  'paom.1459@gmail.com',
  'berenice139888@gmail.com',
  'alba.mgs8@gmail.com',
  'nataliaornelas@live.com.mx',
  'msuzethm@gmail.com',
  'addriannaruiz@gmail.com',
  'lucia.adamezuniga@gmail.com',
  'taylorurbina@gmail.com',
  'ulimo28@gmail.com',
  'epistemems@hotmail.com',
  'tavila80@gmail.com',
  'anacyadls@gmail.com',
]

async function main() {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const relevant = (data?.users ?? []).filter((u) => MIGRATED_EMAILS.includes(u.email!))

  const loggedIn = relevant.filter((u) => u.last_sign_in_at)
  const pending  = relevant.filter((u) => !u.last_sign_in_at)

  console.log(`\n✅ YA INICIARON SESIÓN (${loggedIn.length})`)
  loggedIn.forEach((u) =>
    console.log(`   ${u.email}  —  ${new Date(u.last_sign_in_at!).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`)
  )

  console.log(`\n⏳ PENDIENTES — nunca han entrado (${pending.length})`)
  pending.forEach((u) => console.log(`   ${u.email}`))
}

main().catch(console.error)
