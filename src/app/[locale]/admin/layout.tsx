import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <AdminSidebar locale={locale} />
      <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </div>
  )
}
