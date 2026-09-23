import { createClient } from '@/lib/supabase/server'
import AdminContenido from '@/components/admin/AdminContenido'

export default async function AdminContenidoPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const [{ data: homepage }, { data: settings }, { data: images }] = await Promise.all([
    supabase.from('homepage_content').select('*').single(),
    supabase.from('studio_settings').select('*').eq('id', 1).single(),
    supabase.from('gallery_images').select('*').order('sort_order'),
  ])

  return <AdminContenido homepage={homepage} settings={settings} locale={locale} images={images || []} />
}
