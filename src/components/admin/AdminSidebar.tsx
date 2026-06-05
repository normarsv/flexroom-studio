'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Package,
  Users,
  FileText,
  Image,
  UserCircle,
  BarChart3,
  Home,
} from 'lucide-react'

const navItems = [
  { href: 'schedule', label: 'Horario', icon: CalendarDays },
  { href: 'packages', label: 'Membresías', icon: Package },
  { href: 'instructors', label: 'Instructores', icon: UserCircle },
  { href: 'content', label: 'Contenido', icon: FileText },
  { href: 'gallery', label: 'Galería', icon: Image },
  { href: 'clients', label: 'Clientes', icon: Users },
  { href: 'metrics', label: 'Métricas', icon: BarChart3 },
]

export default function AdminSidebar({ locale }: { locale: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-border shrink-0 flex flex-col">
      <div className="p-4 border-b border-border">
        <p className="font-bold text-primary text-sm">Flex Room</p>
        <p className="text-xs text-muted-foreground">Admin Panel</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const href = `/${locale}/admin/${item.href}`
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-primary hover:bg-secondary'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-secondary"
        >
          <Home className="w-4 h-4" />
          Ver sitio
        </Link>
      </div>
    </aside>
  )
}
