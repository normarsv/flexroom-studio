import { createClient } from '@/lib/supabase/server'
import AdminPackages from '@/components/admin/AdminPackages'

export default async function AdminPackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const [{ data: packages }, { data: classTypes }] = await Promise.all([
    supabase.from('packages').select('*').order('sort_order', { ascending: true }),
    supabase.from('class_types').select('key, name_es, name_en').eq('is_active', true).order('sort_order'),
  ])

  return <AdminPackages packages={packages || []} classTypes={classTypes || []} locale={locale} />
}
