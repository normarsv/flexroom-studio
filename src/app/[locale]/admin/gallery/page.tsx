import { createClient } from '@/lib/supabase/server'
import AdminGallery from '@/components/admin/AdminGallery'

export default async function AdminGalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: images } = await supabase.from('gallery_images').select('*').order('sort_order')
  return <AdminGallery images={images || []} locale={locale} />
}
