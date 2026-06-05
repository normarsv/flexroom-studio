import Image from 'next/image'
import { Instructor } from '@/types'
import { CLASS_TYPE_LABELS } from '@/lib/constants'

interface Props {
  instructor: Instructor
  locale: string
}

export default function CoachCard({ instructor, locale }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="relative h-64 bg-secondary">
        {instructor.photo_url ? (
          <Image
            src={instructor.photo_url}
            alt={instructor.name}
            fill
            className="object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {instructor.name.charAt(0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="text-xl font-bold text-primary">{instructor.name}</h3>

        {instructor.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 mb-3">
            {instructor.specialties.map((type: string) => (
              <span key={type} className="text-xs bg-secondary text-primary px-2 py-0.5 rounded-full font-medium">
                {CLASS_TYPE_LABELS[type as keyof typeof CLASS_TYPE_LABELS]?.[locale === 'es' ? 'es' : 'en'] || type}
              </span>
            ))}
          </div>
        )}

        {instructor.bio && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {instructor.bio}
          </p>
        )}
      </div>
    </div>
  )
}
