import { createClient } from '@/lib/supabase/server'
import AdminInstructors from '@/components/admin/AdminInstructors'

export default async function AdminInstructorsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: instructors } = await supabase.from('instructors').select('*').order('name')
  return <AdminInstructors instructors={instructors || []} locale={locale} />
}
