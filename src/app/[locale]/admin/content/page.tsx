import { createClient } from '@/lib/supabase/server'
import AdminContent from '@/components/admin/AdminContent'

export default async function AdminContentPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: policy } = await supabase
    .from('cancellation_policy')
    .select('*')
    .single()

  return <AdminContent policy={policy} locale={locale} />
}
