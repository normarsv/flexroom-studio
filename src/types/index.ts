export type ClassType = 'funcional' | 'barre' | 'pilates_reformer' | 'pilates_mat' | 'reformer_restaurativo'

export type BookingStatus = 'confirmed' | 'cancelled' | 'waitlist'

export type PackageAllowedTypes = ClassType[] | 'all'

export interface Instructor {
  id: string
  name: string
  bio: string
  photo_url: string | null
  specialties: ClassType[]
  created_at: string
}

export interface ClassSession {
  id: string
  date: string // ISO date string YYYY-MM-DD
  start_time: string // HH:MM
  duration_minutes: number
  class_type: ClassType
  instructor_id: string
  instructor?: Instructor
  capacity: number
  spots_booked: number
  status: 'scheduled' | 'cancelled'
  is_recurring: boolean
  recurring_template_id: string | null
  created_at: string
}

export interface RecurringTemplate {
  id: string
  day_of_week: number // 0=Sunday, 1=Monday ... 6=Saturday
  start_time: string
  duration_minutes: number
  class_type: ClassType
  instructor_id: string
  capacity: number
  is_active: boolean
  created_at: string
}

export interface Package {
  id: string
  name_es: string
  name_en: string
  description_es: string
  description_en: string
  price_mxn: number
  session_count: number | null // null = unlimited
  validity_days: number
  allowed_class_types: ClassType[] | null // null = all types
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface UserPackage {
  id: string
  user_id: string
  package_id: string
  package?: Package
  sessions_remaining: number | null // null = unlimited
  expires_at: string
  purchased_at: string
  stripe_payment_intent_id: string | null
}

export interface Booking {
  id: string
  user_id: string | null // null = guest booking
  guest_name: string | null
  guest_email: string | null
  session_id: string
  session?: ClassSession
  user_package_id: string | null
  status: BookingStatus
  booked_at: string
  cancelled_at: string | null
}

export interface ClassRequest {
  id: string
  email: string
  name: string
  preferred_time: string
  preferred_day: string
  class_type: ClassType | null
  message: string | null
  created_at: string
}

export interface SiteContent {
  id: string
  key: string
  value_es: string
  value_en: string
  updated_at: string
}

export interface GalleryImage {
  id: string
  url: string
  alt_es: string
  alt_en: string
  sort_order: number
  created_at: string
}

export interface CancellationPolicy {
  id: string
  content_es: string
  content_en: string
  updated_at: string
}

export interface HomepageContent {
  id: string
  hero_title_es: string
  hero_title_en: string
  hero_subtitle_es: string
  hero_subtitle_en: string
  hero_image_url: string | null
  about_title_es: string
  about_title_en: string
  about_text_es: string
  about_text_en: string
  about_image_url: string | null
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  credit_sessions: number
  created_at: string
}

export interface StudioSettings {
  id: number
  cancellation_hours_limit: number
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  usage_limit: number | null
  usage_count: number
  per_user_limit: number
  applies_to: 'packages' | 'classes' | 'both'
  allowed_class_types: string[] | null
  first_time_only: boolean
  is_active: boolean
  expires_at: string | null
  created_at: string
}
