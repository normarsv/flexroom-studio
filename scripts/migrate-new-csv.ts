import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const CSV_PATH = '/Users/normars/Downloads/detalles_de_contacto_2026-10-04T23_10_45.366818845Z.csv'
const TEMP_PASSWORD = 'Flex2026!'

interface Contact {
  email: string
  full_name: string
  phone: string
  lifetime_value: number
  segment: string
}

function parseCSV(): Contact[] {
  const csv = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = csv.split('\n').slice(1).filter(l => l.trim())
  const contacts: Contact[] = []

  for (const line of lines) {
    const cols: string[] = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())

    const email = (cols[2] || '').toLowerCase().trim()
    if (!email) continue

    const rawTotal = (cols[23] || '0').replace(/[^0-9.]/g, '')
    contacts.push({
      email,
      full_name: cols[1] || '',
      phone: cols[7] || '',
      lifetime_value: parseFloat(rawTotal) || 0,
      segment: cols[3] || '',
    })
  }
  return contacts
}

async function main() {
  const contacts = parseCSV()

  // Get all existing platform emails
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const platformEmails = new Set((authData?.users ?? []).map((u: any) => u.email?.toLowerCase()))

  const missing = contacts.filter(c => !platformEmails.has(c.email))

  // Count by segment
  const bySegment = missing.reduce((acc: any, c) => { acc[c.segment] = (acc[c.segment] || 0) + 1; return acc }, {})
  console.log('━'.repeat(55))
  console.log(`CSV total: ${contacts.length} | En plataforma: ${platformEmails.size}`)
  console.log(`Nuevos a migrar: ${missing.length}`)
  Object.entries(bySegment).forEach(([s, n]) => console.log(`  ${String(n).padStart(4)}  ${s}`))
  console.log('━'.repeat(55))

  let created = 0, failed = 0

  for (let i = 0; i < missing.length; i++) {
    const c = missing[i]
    process.stdout.write(`[${i + 1}/${missing.length}] ${c.full_name}`)

    const isExPlan = c.segment === 'Ex-plan de una vez'
    const migrated_inactive = isExPlan

    const { data, error } = await supabase.auth.admin.createUser({
      email: c.email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: c.full_name },
    })

    if (error) {
      console.log(` ✗ ${error.message}`)
      failed++
      continue
    }

    const userId = data.user.id

    const { error: profileError } = await supabase.from('profiles').upsert(
      { id: userId, email: c.email, full_name: c.full_name, phone: c.phone || null, lifetime_value: c.lifetime_value, migrated_inactive },
      { onConflict: 'id' }
    )

    if (profileError) {
      console.log(` ✗ profile: ${profileError.message}`)
      failed++
      continue
    }

    // Set password explicitly (learned from previous issue)
    await supabase.auth.admin.updateUserById(userId, { password: TEMP_PASSWORD })

    console.log(` ✓ [${c.segment}]`)
    created++
  }

  console.log('\n' + '━'.repeat(55))
  console.log(`Creados: ${created} | Fallidos: ${failed}`)
}
main().catch(console.error)
