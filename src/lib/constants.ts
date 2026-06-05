import { ClassType } from '@/types'

export const CLASS_TYPE_LABELS: Record<ClassType, { es: string; en: string }> = {
  funcional: { es: 'Funcional', en: 'Functional' },
  barre: { es: 'Barre', en: 'Barre' },
  pilates_reformer: { es: 'Pilates Reformer', en: 'Pilates Reformer' },
  pilates_mat: { es: 'Pilates Mat', en: 'Pilates Mat' },
  reformer_restaurativo: { es: 'Reformer Clásico Restaurativo', en: 'Restorative Classic Reformer' },
}

export const CLASS_TYPE_COLORS: Record<ClassType, string> = {
  funcional: 'bg-blue-100 text-blue-800 border-blue-200',
  barre: 'bg-rose-100 text-rose-800 border-rose-200',
  pilates_reformer: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  pilates_mat: 'bg-purple-100 text-purple-800 border-purple-200',
  reformer_restaurativo: 'bg-teal-100 text-teal-800 border-teal-200',
}

export const BRAND = {
  name: 'Flex Room',
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
