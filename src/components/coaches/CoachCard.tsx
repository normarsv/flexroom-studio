import Image from 'next/image'
import { Instructor } from '@/types'
import { CLASS_TYPE_LABELS } from '@/lib/constants'

interface Props {
  instructor: Instructor
  locale: string
}

export default function CoachCard({ instructor, locale }: Props) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow flex sm:flex-col">
      {/* Photo — horizontal strip on mobile, full-width top on sm+ */}
      <div className="relative w-28 shrink-0 sm:w-full sm:h-64 bg-secondary" style={{ minHeight: '9rem' }}>
        {instructor.photo_url ? (
          <Image
            src={instructor.photo_url}
            alt={instructor.name}
            fill
            className="object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F4EF71]/30 to-[#C8C8C8]/40">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1E1E1E]/10 flex items-center justify-center">
              <span className="font-heading font-black text-2xl sm:text-3xl text-[#1E1E1E]/60">
                {instructor.name.charAt(0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 sm:p-5 flex flex-col justify-center">
        <h3 className="font-heading font-extrabold text-lg sm:text-xl text-foreground">{instructor.name}</h3>

        {instructor.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 mb-2 sm:mb-3">
            {instructor.specialties.map((type: string) => (
              <span key={type} className="text-xs bg-[#F4EF71] text-[#1E1E1E] px-2 py-0.5 rounded-full font-semibold">
                {CLASS_TYPE_LABELS[type as keyof typeof CLASS_TYPE_LABELS]?.[locale === 'es' ? 'es' : 'en'] || type}
              </span>
            ))}
          </div>
        )}

        {instructor.bio && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-4 sm:line-clamp-none">
            {instructor.bio}
          </p>
        )}
      </div>
    </div>
  )
}
