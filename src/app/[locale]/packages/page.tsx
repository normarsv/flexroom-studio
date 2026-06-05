import { createClient } from '@/lib/supabase/server'
import PackagesList from '@/components/packages/PackagesList'

export default async function PackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  return <PackagesList packages={packages || []} locale={locale} userId={user?.id || null} />
}
