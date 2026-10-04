#!/usr/bin/env npx tsx
/**
 * Migrate "Prospecto" Fitune contacts → Flexroom Studio
 *
 * Creates auth account + profile for 303 prospects.
 * lifetime_value = 0, no package → they appear as "Prospecto" automatically.
 * Temp password: Flex2026!
 *
 * Run: npx tsx scripts/migrate-prospectos.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEMP_PASSWORD = 'Flex2026!'
const CSV_PATH = '/Users/normars/Downloads/detalles_de_contacto_2026-10-04T18_54_51.105817186Z.csv'

interface Contact {
  email: string
  full_name: string
  phone: string
}

function parseCSV(): Contact[] {
  const csv = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = csv.split('\n').slice(1).filter((l) => l.trim())
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

    if ((cols[3] || '') !== 'Prospecto') continue
    const email = (cols[2] || '').toLowerCase().trim()
    if (!email) continue

    contacts.push({ email, full_name: cols[1] || '', phone: cols[7] || '' })
  }

  return contacts
}

async function migrateContact(contact: Contact): Promise<'created' | 'existing' | 'error'> {
  const { data, error } = await supabase.auth.admin.createUser({
    email: contact.email,
    password: TEMP_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: contact.full_name },
  })

  let userId: string

  if (error) {
    if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('exists')) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const existing = list?.users?.find(u => u.email?.toLowerCase() === contact.email)
      if (!existing) { console.error(`  ✗ ${error.message}`); return 'error' }
      userId = existing.id
      process.stdout.write(` ↩`)
      return 'existing'
    }
    console.error(`  ✗ ${error.message}`)
    return 'error'
  }

  userId = data.user.id

  const { error: profileError } = await supabase.from('profiles').upsert(
    { id: userId, email: contact.email, full_name: contact.full_name, phone: contact.phone || null, lifetime_value: 0 },
    { onConflict: 'id' }
  )

  if (profileError) { console.error(`  ✗ Profile: ${profileError.message}`); return 'error' }

  process.stdout.write(` ✓`)
  return 'created'
}

async function main() {
  const contacts = parseCSV()

  console.log('━'.repeat(55))
  console.log('Fitune Prospectos → Flexroom Studio')
  console.log(`Total: ${contacts.length} prospectos`)
  console.log(`Contraseña temporal: ${TEMP_PASSWORD}`)
  console.log('━'.repeat(55))

  let created = 0, existing = 0, failed = 0

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]
    process.stdout.write(`[${i + 1}/${contacts.length}] ${contact.full_name}`)
    try {
      const result = await migrateContact(contact)
      if (result === 'created') created++
      else if (result === 'existing') existing++
      else failed++
    } catch (err) {
      console.error(`  ✗ ${err}`)
      failed++
    }
    console.log()
  }

  console.log('\n' + '━'.repeat(55))
  console.log(`Creados: ${created} | Ya existían: ${existing} | Fallidos: ${failed}`)
}

main().catch(console.error)
