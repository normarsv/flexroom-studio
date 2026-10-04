#!/usr/bin/env npx tsx
/**
 * Migrate "Pago de una vez" Fitune contacts → Flexroom Studio
 *
 * Creates auth account + profile for 45 one-time-payment clients.
 * Sets lifetime_value from Fitune CSV so they appear as "Nuevo" (not Prospecto).
 * No package assigned — they purchase individually going forward.
 * Temp password: Flex2026!
 *
 * Run: npx tsx scripts/migrate-pagounavez.ts
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

const TARGET_EMAILS = new Set([
  'ameliegnunes@gmail.com',
  'shahafweisbein@gmail.com',
  'skarenconcepcion@gmail.com',
  'evelynbella2005@gmail.com',
  'daffne157@gmail.com',
  'veronicaaescobaar@gmail.com',
  'auroradelightwood@gmail.com',
  'atemarce01@gmail.com',
  'natascha.wanninger@outlook.de',
  'feliciadetalhouet@gmail.com',
  'gloarmu@gmail.com',
  'mariaguilar_sanz@hotmail.com',
  'alephc.94@hotmail.com',
  'danidguez12@hotmail.com',
  'pamegoes@icloud.com',
  'diveglez03@gmail.com',
  'lucerolgomez30@gmail.com',
  'eiraballinas01@gmail.com',
  'mflores_barrios@hotmail.com',
  'angienelsonlopez@gmail.com',
  'dannamariel@gmail.com',
  'valentinacc00978@gmail.com',
  'saleb_3001@hotmail.com',
  'sebb_trance@hotmail.com',
  'mouchel.selma@gmail.com',
  'dianagomeztadeo.95@gmail.com',
  'wolfrom.clemence.mx@gmail.com',
  'paohibarra9@gmail.com',
  'marteddugwen@gmail.com',
  'francely967@gmail.com',
  'gracielagtzca.29@gmail.com',
  'ingrid.navarro78@unach.mx',
  'efra13ev@gmail.com',
  'ximluna@live.com.mx',
  'marijotp05@gmail.com',
  'sandricardoescalona@gmail.com',
  'yasdguez13@gmail.com',
  'dat997@gmail.com',
  'amarantacepeda@gmail.com',
  'xime-008@hotmail.com',
  'ximefonseca23@icloud.com',
  'keylazrb@hotmail.com',
  'laumaria-martinez08@hotmail.com',
  'guadalupelopez2234@gmail.com',
  'ainatsol@hotmail.com',
])

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

    const email = (cols[2] || '').toLowerCase().trim()
    if (!TARGET_EMAILS.has(email)) continue

    // Parse "Total recibido" — may be formatted like "1,234" or "1234"
    const rawTotal = (cols[23] || '0').replace(/[^0-9.]/g, '')
    const lifetime_value = parseFloat(rawTotal) || 0

    contacts.push({
      email,
      full_name: cols[1] || '',
      phone: cols[7] || '',
      lifetime_value,
    })
  }

  return contacts
}

async function migrateContact(contact: Contact): Promise<'created' | 'existing' | 'error'> {
  console.log(`\n→ ${contact.full_name} (${contact.email})`)

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
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === contact.email.toLowerCase())
      if (!existing) {
        console.error(`  ✗ Auth error: ${error.message}`)
        return 'error'
      }
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
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    console.error(`  ✗ Profile: ${profileError.message}`)
    return 'error'
  }

  console.log(`  ✓ Profile (lifetime_value: $${contact.lifetime_value.toLocaleString('es-MX')})`)
  return data ? 'created' : 'existing'
}

async function main() {
  console.log('━'.repeat(55))
  console.log('Fitune Pago de una vez → Flexroom Studio')
  console.log(`Contraseña temporal: ${TEMP_PASSWORD}`)
  console.log('━'.repeat(55))

  const contacts = parseCSV()
  console.log(`\nContactos encontrados en CSV: ${contacts.length}`)

  let created = 0, existing = 0, failed = 0

  for (const contact of contacts) {
    try {
      const result = await migrateContact(contact)
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
  console.log('\nPendiente manual:')
  console.log('  ⏸ Camila Naomi Carrasco Cruz — definir paquete STUDENT Flow')
  console.log('  ⏸ Sha Weisbein — verificar si tiene créditos pendientes en Fitune')
}

main().catch(console.error)
