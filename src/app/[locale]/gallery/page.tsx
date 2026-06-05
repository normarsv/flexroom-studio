import { createClient } from '@/lib/supabase/server'
import { useTranslations } from 'next-intl'
import GalleryGrid from '@/components/gallery/GalleryGrid'

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: images } = await supabase
    .from('gallery_images')
    .select('*')
    .order('sort_order', { ascending: true })

  return <GalleryGrid images={images || []} locale={locale} />
}
