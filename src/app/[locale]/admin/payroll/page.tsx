import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPayroll from '@/components/admin/AdminPayroll'

export default async function AdminPayrollPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect(`/${locale}/admin`)

  const [instructorsRes, classTypesRes, overridesRes] = await Promise.all([
    supabase.from('instructors').select('*').order('name'),
    supabase.from('class_types').select('*').order('sort_order'),
    supabase.from('instructor_rate_overrides').select('*'),
  ])

  return (
    <AdminPayroll
      instructors={instructorsRes.data || []}
      classTypes={classTypesRes.data || []}
      initialOverrides={overridesRes.data || []}
    />
  )
}
