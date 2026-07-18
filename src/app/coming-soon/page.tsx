import ComingSoon from '@/components/ComingSoon'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Flexroom Studio — Próximamente',
  description: 'Estamos preparando un nuevo espacio lleno de energía, dinamismo y flexibilidad. Muy pronto abrimos las puertas.',
}

export default async function ComingSoonPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('studio_settings').select('coming_soon_password, coming_soon_launch_date').eq('id', 1).single()

  return (
    <ComingSoon
      password={settings?.coming_soon_password || 'flexroom2026'}
      launchDate={settings?.coming_soon_launch_date || ''}
    />
  )
}
