#!/usr/bin/env npx tsx
/**
 * Migrate "Ex-plan de una vez" Fitune contacts → Flexroom Studio as Inactivo
 *
 * Creates auth account + profile with migrated_inactive=true for 175 ex-clients.
 * They will show as "Inactivo" in the admin table (not Nuevo).
 * No package assigned.
 * Temp password: Flex2026!
 *
 * Run: npx tsx scripts/migrate-explan.ts
 *
 * REQUIRES: ALTER TABLE profiles ADD COLUMN migrated_inactive boolean NOT NULL DEFAULT false;
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
  lifetime_value: number
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

    const segment = cols[3] || ''
    if (segment !== 'Ex-plan de una vez') continue

    const rawTotal = (cols[23] || '0').replace(/[^0-9.]/g, '')
    contacts.push({
      email: (cols[2] || '').toLowerCase().trim(),
      full_name: cols[1] || '',
      phone: cols[7] || '',
      lifetime_value: parseFloat(rawTotal) || 0,
    })
  }

  return contacts
}

async function migrateContact(contact: Contact, platformEmails: Set<string>): Promise<'created' | 'existing' | 'error'> {
  if (platformEmails.has(contact.email)) {
    console.log(`  ↩ Ya en plataforma, actualizando migrated_inactive...`)
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const existing = list?.users?.find(u => u.email?.toLowerCase() === contact.email)
    if (existing) {
      await supabase.from('profiles').update({ migrated_inactive: true }).eq('id', existing.id)
      console.log(`  ✓ migrated_inactive=true`)
    }
    return 'existing'
  }

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
      const existing = list?.users?.find(u => u.email?.toLowerCase() === contact.email.toLowerCase())
      if (!existing) { console.error(`  ✗ ${error.message}`); return 'error' }
      userId = existing.id
      console.log(`  ↩ Auth ya existe: ${userId}`)
    } else {
      console.error(`  ✗ Auth error: ${error.message}`)
      return 'error'
    }
  } else {
    userId = data.user.id
    console.log(`  ✓ Auth creado: ${userId}`)
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: contact.email,
      full_name: contact.full_name,
      phone: contact.phone || null,
      lifetime_value: contact.lifetime_value,
      migrated_inactive: true,
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    console.error(`  ✗ Profile: ${profileError.message}`)
    return 'error'
  }

  console.log(`  ✓ Profile (lifetime_value: $${contact.lifetime_value.toLocaleString('es-MX')}, inactivo)`)
  return 'created'
}

async function main() {
  const contacts = parseCSV()

  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const platformEmails = new Set((authData?.users ?? []).map((u: any) => u.email?.toLowerCase()))

  console.log('━'.repeat(55))
  console.log('Fitune Ex-plan de una vez → Flexroom Studio (Inactivo)')
  console.log(`Total en CSV: ${contacts.length}`)
  console.log(`Contraseña temporal: ${TEMP_PASSWORD}`)
  console.log('━'.repeat(55))

  let created = 0, existing = 0, failed = 0

  for (const contact of contacts) {
    console.log(`\n→ ${contact.full_name} (${contact.email})`)
    try {
      const result = await migrateContact(contact, platformEmails)
      if (result === 'created') created++
      else if (result === 'existing') existing++
      else failed++
    } catch (err) {
      console.error(`  ✗ Error inesperado: ${err}`)
      failed++
    }
  }

  console.log('\n' + '━'.repeat(55))
  console.log(`Creados: ${created} | Ya existían: ${existing} | Fallidos: ${failed}`)
}

main().catch(console.error)
