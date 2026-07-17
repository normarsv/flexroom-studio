import { createClient } from '@/lib/supabase/server'
import AdminCoupons from '@/components/admin/AdminCoupons'

export default async function AdminCouponsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  return <AdminCoupons coupons={data || []} />
}
