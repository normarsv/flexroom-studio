import { createClient } from '@/lib/supabase/server'
import { useTranslations } from 'next-intl'
import CoachCard from '@/components/coaches/CoachCard'

export default async function CoachesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: instructors } = await supabase
    .from('instructors')
    .select('*')
    .order('name', { ascending: true })

  return <CoachesList instructors={instructors || []} locale={locale} />
}

function CoachesList({ instructors, locale }: { instructors: any[]; locale: string }) {
  const t = useTranslations('coaches')

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {instructors.map((instructor) => (
          <CoachCard key={instructor.id} instructor={instructor} locale={locale} />
        ))}
      </div>
    </div>
  )
}
