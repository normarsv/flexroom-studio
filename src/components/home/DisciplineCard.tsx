import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type IconDefinition } from '@fortawesome/fontawesome-svg-core'

interface DisciplineCardProps {
  title: string
  description: string
  tag: string
  icon: IconDefinition
  featured?: boolean
}

export default function DisciplineCard({ title, description, tag, icon, featured }: DisciplineCardProps) {
  return (
    <div className={`rounded-2xl p-8 ${featured ? 'bg-[#1E1E1E] shadow-xl scale-[1.02]' : 'bg-card border border-border shadow-sm'}`}>
      <div className={`text-2xl mb-4 ${featured ? 'text-[#F4EF71]' : 'text-[#868686]'}`}>
        <FontAwesomeIcon icon={icon} />
      </div>
      <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 rounded-full ${featured ? 'bg-[#F4EF71]/20 text-[#F4EF71]' : 'bg-secondary text-muted-foreground'}`}>
        {tag}
      </span>
      <h3 className={`font-heading font-extrabold text-2xl mt-4 mb-3 ${featured ? 'text-white' : 'text-foreground'}`}>
        {title}
      </h3>
      <p className={`text-sm leading-relaxed ${featured ? 'text-white/65' : 'text-muted-foreground'}`}>
        {description}
      </p>
    </div>
  )
}
