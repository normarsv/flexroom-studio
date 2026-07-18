import ComingSoon from '@/components/ComingSoon'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'flexroom. fit social hub',
  description: 'Pilates Reformer, Funcional y Barre en San Cristóbal de las Casas, Chiapas. Muy pronto abrimos las puertas.',
  openGraph: {
    title: 'flexroom. fit social hub',
    description: 'Pilates Reformer, Funcional y Barre en San Cristóbal de las Casas, Chiapas. Muy pronto abrimos las puertas.',
    url: 'https://www.flexroomstudio.com',
    siteName: 'flexroom.',
    images: [{ url: 'https://www.flexroomstudio.com/api/og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'flexroom. fit social hub',
    description: 'Pilates Reformer, Funcional y Barre en San Cristóbal de las Casas, Chiapas.',
    images: ['https://www.flexroomstudio.com/api/og'],
  },
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
