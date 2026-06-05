import { createClient } from '@/lib/supabase/server'
import AdminPackages from '@/components/admin/AdminPackages'

export default async function AdminPackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .order('sort_order', { ascending: true })

  return <AdminPackages packages={packages || []} locale={locale} />
}
