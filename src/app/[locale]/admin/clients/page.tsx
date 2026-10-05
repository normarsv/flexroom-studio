import { createClient } from '@/lib/supabase/server'
import AdminClientsTable from '@/components/admin/AdminClientsTable'

async function fetchAll(supabase: any, table: string, select: string, filters: (q: any) => any) {
  const all: any[] = []
  let page = 0
  while (true) {
    const q = supabase.from(table).select(select)
    const { data } = await filters(q).range(page * 1000, page * 1000 + 999)
    if (!data?.length) break
    all.push(...data)
    if (data.length < 1000) break
    page++
  }
  return all
}

export default async function AdminClientsPage() {
  const supabase = await createClient()

  const [profiles, packagesData, userPackages, credits, bookings] = await Promise.all([
    fetchAll(
      supabase,
      'profiles',
      'id, email, full_name, phone, lifetime_value, migrated_inactive, created_at, last_login_at',
      (q: any) => q.eq('is_admin', false).order('created_at', { ascending: false })
    ),
    supabase
      .from('packages')
      .select('id, name_es, session_count, validity_days')
      .eq('is_active', true)
      .order('sort_order')
      .then((r: any) => r.data || []),
    fetchAll(
      supabase,
      'user_packages',
      'id, user_id, expires_at, sessions_remaining, purchased_at, package:packages(name_es, price_mxn)',
      (q: any) => q
    ),
    fetchAll(
      supabase,
      'credits',
      'id, user_id, class_type',
      (q: any) => q
    ),
    fetchAll(
      supabase,
      'bookings',
      'user_id, created_at, status, attended, price_paid, session:class_sessions(date, class_type, start_time)',
      (q: any) => q.not('user_id', 'is', null)
    ),
  ])

  // Group related data by user_id
  const packagesByUser: Record<string, any[]> = {}
  for (const up of userPackages) {
    if (!packagesByUser[up.user_id]) packagesByUser[up.user_id] = []
    packagesByUser[up.user_id].push(up)
  }

  const creditsByUser: Record<string, any[]> = {}
  for (const c of credits) {
    if (!creditsByUser[c.user_id]) creditsByUser[c.user_id] = []
    creditsByUser[c.user_id].push(c)
  }

  const bookingsByUser: Record<string, any[]> = {}
  for (const b of bookings) {
    if (!bookingsByUser[b.user_id]) bookingsByUser[b.user_id] = []
    bookingsByUser[b.user_id].push(b)
  }

  const clients = profiles.map((p: any) => ({
    ...p,
    user_packages: packagesByUser[p.id] || [],
    credits: creditsByUser[p.id] || [],
    bookings: bookingsByUser[p.id] || [],
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Clientes</h1>
        <span className="text-sm text-muted-foreground">{clients.length} registrados</span>
      </div>
      <AdminClientsTable
        clients={clients as any}
        packages={(packagesData as any) || []}
      />
    </div>
  )
}
