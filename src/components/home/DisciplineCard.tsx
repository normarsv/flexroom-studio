interface DisciplineCardProps {
  title: string
  description: string
  tag: string
  icon: string
  featured?: boolean
}

export default function DisciplineCard({ title, description, tag, icon, featured }: DisciplineCardProps) {
  return (
    <div className={`rounded-2xl p-8 ${featured ? 'bg-primary text-primary-foreground shadow-xl scale-[1.02]' : 'bg-white border border-border shadow-sm'}`}>
      <div className="text-3xl mb-4">{icon}</div>
      <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 rounded-full ${featured ? 'bg-white/20 text-primary-foreground/80' : 'bg-secondary text-primary/70'}`}>
        {tag}
      </span>
      <h3 className={`text-2xl font-bold mt-4 mb-3 ${featured ? 'text-primary-foreground' : 'text-primary'}`}>
        {title}
      </h3>
      <p className={`text-sm leading-relaxed ${featured ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>
        {description}
      </p>
    </div>
  )
}
