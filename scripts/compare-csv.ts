import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  // Read CSV
  const csv = fs.readFileSync('/Users/normars/Downloads/detalles_de_contacto_2026-10-04T18_54_51.105817186Z.csv', 'utf-8')
  const lines = csv.split('\n').slice(1).filter(l => l.trim())

  // Parse CSV rows (simple split by comma won't work for quoted fields — use a basic parser)
  const csvUsers: { name: string; email: string; segment: string; memberships: string }[] = []
  for (const line of lines) {
    // Split respecting quoted fields
    const cols: string[] = []
    let cur = ''
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())

    const name = cols[1] || ''
    const email = (cols[2] || '').toLowerCase().trim()
    const segment = cols[3] || ''
    const memberships = cols[17] || ''
    if (email) csvUsers.push({ name, email, segment, memberships })
  }

  // Get all platform users
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const platformEmails = new Set((authData?.users ?? []).map((u: any) => u.email?.toLowerCase()))

  // Find CSV users NOT in platform
  const missing = csvUsers.filter(u => !platformEmails.has(u.email))

  console.log(`\nCSV total: ${csvUsers.length} | Plataforma: ${platformEmails.size}`)
  console.log(`\n❌ EN CSV PERO NO EN PLATAFORMA (${missing.length}):\n`)
  console.log('Nombre'.padEnd(35) + 'Email'.padEnd(35) + 'Segmento'.padEnd(15) + 'Membresía')
  console.log('─'.repeat(100))
  missing.forEach(u => {
    console.log(u.name.slice(0,33).padEnd(35) + u.email.slice(0,33).padEnd(35) + u.segment.slice(0,13).padEnd(15) + u.memberships)
  })
}

main().catch(console.error)
