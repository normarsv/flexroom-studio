import AdminSidebar from '@/components/admin/AdminSidebar'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('is_admin, is_coach').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.is_admin === true
  const isCoach = profile?.is_coach === true

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <AdminSidebar locale={locale} isAdmin={isAdmin} isCoach={isCoach} />
      <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </div>
  )
}
