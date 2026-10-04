#!/usr/bin/env npx tsx
/**
 * Fitune → Flexroom Studio migration script
 *
 * Migrates 18 active members (Camila/Karla/Sha handled separately).
 * Run: npx tsx scripts/migrate-fitune.ts
 *
 * Required env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Package IDs (from Supabase query 2026-10-04) ──────────────────────────────
const PKG = {
  MIXTO_4:      'eb4cdc85-9c1f-4892-9378-ae78d0ac58a6',
  MIXTO_8:      '90e2f3f5-8e93-4505-acb3-ae4a11f796c9',
  MIXTO_12:     'dcffb2dc-a2f9-43d8-9685-d21489808195',
  MIXTO_20:     'bd22bdef-ede2-4f49-820e-f1b6a7ed7d55',
  FUNCIONAL_12: '29b14931-ff2e-4620-93dd-7b674c31a88e',
  BARRE_8:      '9a13b1dc-763b-4fdc-bcd5-1169c0156392',
  FULL_PREMIUM: '0df0cebc-3094-4bdd-8541-c6b962e51944',
} as const

const NO_EXPIRY = '2099-12-31T00:00:00Z'

interface Member {
  email: string
  full_name: string
  phone?: string
  lifetime_value: number       // historical Fitune total (MXN)
  package_id: string
  sessions_remaining: number | null  // null = unlimited (Full Premium)
  expires_at: string
}

// ── Active members data (collected from Fitune 2026-10-04) ───────────────────
const ACTIVE_MEMBERS: Member[] = [
  {
    email: 'bla.pal.hdz@gmail.com',
    full_name: 'Paloma Hernández Mendoza',
    phone: '+529671025202',
    lifetime_value: 6650,
    package_id: PKG.MIXTO_8,
    sessions_remaining: 4,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'patyov@hotmail.com',
    full_name: 'Patricia Ordaz Vera',
    phone: '+9671022265',
    lifetime_value: 11500,
    package_id: PKG.FUNCIONAL_12,
    sessions_remaining: 3,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'valentina.auletta@gmail.com',
    full_name: 'Valentina Auletta',
    phone: '+525568851481',
    lifetime_value: 10160,
    package_id: PKG.MIXTO_8,
    sessions_remaining: 3,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'athenas1999@gmail.com',
    full_name: 'Athena Moreno',
    phone: '+527353445776',
    lifetime_value: 10930,
    package_id: PKG.FUNCIONAL_12,
    sessions_remaining: 1,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'dilanaor08@gmail.com',
    full_name: 'Diana Laura Najera Ortega',
    phone: '+529671547161',
    lifetime_value: 3330,
    package_id: PKG.MIXTO_20,
    sessions_remaining: 16,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'estherlazos@gmail.com',
    full_name: 'Esther Cordero Lazos',
    phone: '+9671017475',
    lifetime_value: 7800,
    package_id: PKG.MIXTO_12,
    sessions_remaining: 6,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'paom.1459@gmail.com',
    full_name: 'Paola del Carmen Mijangos Rodriguez',
    lifetime_value: 0,
    package_id: PKG.MIXTO_4,
    sessions_remaining: 4,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'berenice139888@gmail.com',
    full_name: 'Diana Espinosa Gomez',
    phone: '+529671681266',
    lifetime_value: 4600,
    package_id: PKG.MIXTO_8,
    sessions_remaining: 6,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'alba.mgs8@gmail.com',
    full_name: 'Alba Garcia',
    phone: '+529671195226',
    lifetime_value: 7350,
    package_id: PKG.FULL_PREMIUM,
    sessions_remaining: null,
    expires_at: '2026-11-02T00:00:00Z',  // expiry shown in Fitune
  },
  {
    email: 'nataliaornelas@live.com.mx',
    full_name: 'Natalia Ornelas',
    phone: '+529671241757',
    lifetime_value: 4510,
    package_id: PKG.MIXTO_20,
    sessions_remaining: 17,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'msuzethm@gmail.com',
    full_name: 'Suzet Hernández Montoya',
    phone: '+529671248274',
    lifetime_value: 2180,
    package_id: PKG.MIXTO_8,
    sessions_remaining: 2,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'addriannaruiz@gmail.com',
    full_name: 'Adriana Ruiz Sancho',
    phone: '+9676801128',
    lifetime_value: 2130,
    package_id: PKG.MIXTO_8,
    sessions_remaining: 5,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'lucia.adamezuniga@gmail.com',
    full_name: 'Lucia Adame',
    phone: '+9671424254',
    lifetime_value: 950,
    package_id: PKG.BARRE_8,
    sessions_remaining: 4,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'taylorurbina@gmail.com',
    full_name: 'Cinthia Araceli Urbina Taylor',
    phone: '+525541173208',
    lifetime_value: 1300,
    package_id: PKG.MIXTO_12,
    sessions_remaining: 8,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'ulimo28@gmail.com',
    full_name: 'Monica Ariadna Hernandez Corona',
    phone: '+9611770087',
    lifetime_value: 1000,
    package_id: PKG.FUNCIONAL_12,
    sessions_remaining: 5,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'epistemems@hotmail.com',
    full_name: 'Margoth Macias',
    phone: '+529611934727',
    lifetime_value: 600,
    package_id: PKG.MIXTO_4,
    sessions_remaining: 2,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'tavila80@gmail.com',
    full_name: 'Traudy Avila Schlottfeldt',
    phone: '+9672470088',
    lifetime_value: 1000,
    package_id: PKG.MIXTO_8,
    sessions_remaining: 7,
    expires_at: NO_EXPIRY,
  },
  {
    email: 'anacyadls@gmail.com',
    full_name: 'Anahi de los Santos',
    phone: '+9614382095',
    lifetime_value: 1800,
    package_id: PKG.MIXTO_20,
    sessions_remaining: 17,
    expires_at: NO_EXPIRY,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateAuthUser(email: string, full_name: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (!error) return data.user.id

  if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('exists')) {
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (existing) return existing.id
  }

  console.error(`  ✗ Auth error for ${email}: ${error.message}`)
  return null
}

async function migrateMember(member: Member): Promise<void> {
  console.log(`\n→ ${member.full_name} (${member.email})`)

  const userId = await getOrCreateAuthUser(member.email, member.full_name)
  if (!userId) return

  console.log(`  ✓ Auth: ${userId}`)

  // Upsert profile
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: member.email,
      full_name: member.full_name,
      phone: member.phone ?? null,
      lifetime_value: member.lifetime_value,
    },
    { onConflict: 'id' }
  )
  if (profileError) {
    console.error(`  ✗ Profile: ${profileError.message}`)
    return
  }
  console.log(`  ✓ Profile (lifetime_value: $${member.lifetime_value.toLocaleString('es-MX')})`)

  // Skip package if one already exists for this user+package combo
  const { data: existing } = await supabase
    .from('user_packages')
    .select('id')
    .eq('user_id', userId)
    .eq('package_id', member.package_id)
    .maybeSingle()

  if (existing) {
    console.log(`  ↩ Package already migrated, skipping`)
    return
  }

  const { error: pkgError } = await supabase.from('user_packages').insert({
    user_id: userId,
    package_id: member.package_id,
    sessions_remaining: member.sessions_remaining,
    expires_at: member.expires_at,
    stripe_payment_intent_id: null,
  })
  if (pkgError) {
    console.error(`  ✗ Package: ${pkgError.message}`)
    return
  }
  console.log(`  ✓ Package (${member.sessions_remaining ?? 'ilimitado'} sesiones, vence: ${member.expires_at.slice(0, 10)})`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('━'.repeat(55))
  console.log(`Fitune → Flexroom Studio Migration`)
  console.log(`Migrando ${ACTIVE_MEMBERS.length} miembros activos`)
  console.log('━'.repeat(55))

  let ok = 0
  let failed = 0

  for (const member of ACTIVE_MEMBERS) {
    try {
      await migrateMember(member)
      ok++
    } catch (err) {
      console.error(`  ✗ Unexpected error: ${err}`)
      failed++
    }
  }

  console.log('\n' + '━'.repeat(55))
  console.log(`Completado: ${ok} exitosos, ${failed} fallidos`)
  console.log('\nPendientes (manejar manualmente):')
  console.log('  ⏸ Sha Weisbein — obtener membresía de Fitune')
  console.log('  ⏸ Karla Maria Gutierrez — verificar ciclo FULL PREMIUM activo')
  console.log('  ⏸ Camila Naomi Carrasco Cruz — definir paquete para STUDENT Flow')
  console.log('\nRecuerda re-reservar manualmente las 4 clientas con clases próximas:')
  console.log('  • Karla Maria Gutierrez — 4 próximas (desde oct 5)')
  console.log('  • Diana Laura Najera Ortega — 4 próximas (desde oct 5)')
  console.log('  • Paloma Hernández Mendoza — 2 próximas (desde oct 6)')
  console.log('  • Diana Espinosa Gomez — 2 próximas (desde oct 5)')
}

main().catch(console.error)
