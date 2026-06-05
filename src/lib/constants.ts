import { ClassType } from '@/types'

export const CLASS_TYPE_LABELS: Record<ClassType, { es: string; en: string }> = {
  funcional: { es: 'Funcional', en: 'Functional' },
  barre: { es: 'Barre', en: 'Barre' },
  pilates_reformer: { es: 'Pilates Reformer', en: 'Pilates Reformer' },
  pilates_mat: { es: 'Pilates Mat', en: 'Pilates Mat' },
  reformer_restaurativo: { es: 'Reformer Clásico Restaurativo', en: 'Restorative Classic Reformer' },
}

export const CLASS_TYPE_COLORS: Record<ClassType, string> = {
  funcional: 'bg-[#F4EF71]/30 text-[#1E1E1E] border-[#F4EF71]/50',
  barre: 'bg-[#868686]/15 text-[#1E1E1E] border-[#868686]/30',
  pilates_reformer: 'bg-[#F4EF71]/50 text-[#1E1E1E] border-[#F4EF71]/70',
  pilates_mat: 'bg-[#C8C8C8]/40 text-[#1E1E1E] border-[#C8C8C8]/60',
  reformer_restaurativo: 'bg-[#868686]/20 text-[#1E1E1E] border-[#868686]/40',
}

export const BRAND = {
  name: 'flexroom.',
  tagline_es: 'Tu segundo hogar',
  tagline_en: 'Your second home',
  address: 'Crescencio Rosas 54, Barrio de San Diego, San Cristóbal de las Casas, Chiapas',
  instagram: 'https://www.instagram.com/flexroomstudio',
  email: 'hola@flexroomstudio.com',
}

export const DAYS_OF_WEEK = [
  { value: 1, es: 'Lunes', en: 'Monday' },
  { value: 2, es: 'Martes', en: 'Tuesday' },
  { value: 3, es: 'Miércoles', en: 'Wednesday' },
  { value: 4, es: 'Jueves', en: 'Thursday' },
  { value: 5, es: 'Viernes', en: 'Friday' },
  { value: 6, es: 'Sábado', en: 'Saturday' },
  { value: 0, es: 'Domingo', en: 'Sunday' },
]
