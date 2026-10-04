import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const csv = fs.readFileSync('/Users/normars/Downloads/detalles_de_contacto_2026-10-04T18_54_51.105817186Z.csv', 'utf-8')
  const lines = csv.split('\n').slice(1).filter((l: string) => l.trim())

  const csvUsers: any[] = []
  for (const line of lines) {
    const cols: string[] = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    const segment = cols[3] || ''
    if (segment === 'Plan de una vez activo' || segment === 'Pago de una vez') {
      csvUsers.push({
        name: cols[1],
        email: (cols[2]||'').toLowerCase().trim(),
        segment,
        memberships: cols[17],
        mobile: cols[7],
        totalRecibido: cols[23],
      })
    }
  }

  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const platformEmails = new Set((authData?.users ?? []).map((u: any) => u.email?.toLowerCase()))
  const missing = csvUsers.filter((u: any) => !platformEmails.has(u.email))

  const withMembership = missing.filter((u: any) => u.memberships && u.memberships.trim() !== '')
  const withoutMembership = missing.filter((u: any) => !u.memberships || u.memberships.trim() === '')

  console.log('🔴 CON MEMBRESÍA ACTIVA EN FITUNE — necesitan créditos (' + withMembership.length + '):')
  withMembership.forEach((u: any) => console.log('  ' + u.name.padEnd(35) + u.email.padEnd(38) + u.memberships))

  console.log('\n⚪ SIN MEMBRESÍA ACTIVA — solo cuenta (prospectos) (' + withoutMembership.length + '):')
  withoutMembership.forEach((u: any) => console.log('  ' + u.name.padEnd(35) + u.email.padEnd(38) + u.segment))
}

main().catch(console.error)
