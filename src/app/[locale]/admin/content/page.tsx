import { createClient } from '@/lib/supabase/server'
import AdminContent from '@/components/admin/AdminContent'

export default async function AdminContentPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const [{ data: policy }, { data: homepage }] = await Promise.all([
    supabase.from('cancellation_policy').select('*').single(),
    supabase.from('homepage_content').select('*').single(),
  ])

  return <AdminContent policy={policy} homepage={homepage} locale={locale} />
}
