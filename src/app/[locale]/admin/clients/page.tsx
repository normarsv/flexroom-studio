import { createClient } from '@/lib/supabase/server'
import AdminClientsTable from '@/components/admin/AdminClientsTable'

export default async function AdminClientsPage() {
  const supabase = await createClient()

  const [profilesRes, packagesRes, bookingsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, user_packages(id, expires_at, sessions_remaining, package:packages(name_es))')
      .eq('is_admin', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('packages')
      .select('id, name_es, session_count, validity_days')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('bookings')
      .select('user_id, created_at, status, session:class_sessions(date, class_type, start_time)')
      .not('user_id', 'is', null),
  ])

  // Group bookings by user_id and attach to profiles
  const bookingsByUser: Record<string, any[]> = {}
  for (const b of bookingsRes.data || []) {
    if (!bookingsByUser[b.user_id]) bookingsByUser[b.user_id] = []
    bookingsByUser[b.user_id].push(b)
  }

  const clients = (profilesRes.data || []).map((p: any) => ({
    ...p,
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
        packages={(packagesRes.data as any) || []}
      />
    </div>
  )
}
