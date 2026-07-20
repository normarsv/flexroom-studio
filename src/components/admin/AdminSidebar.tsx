'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faBox,
  faUsers,
  faFileLines,
  faImage,
  faCircleUser,
  faChartBar,
  faHouse,
  faTag,
  faCircleQuestion,
} from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

const navItems: { href: string; label: string; icon: IconDefinition }[] = [
  { href: 'schedule', label: 'Clases', icon: faCalendarDays },
  { href: 'packages', label: 'Membresías', icon: faBox },
  { href: 'instructors', label: 'Instructores', icon: faCircleUser },
  { href: 'gallery', label: 'Galería', icon: faImage },
  { href: 'clients', label: 'Clientes', icon: faUsers },
  { href: 'metrics', label: 'Métricas', icon: faChartBar },
  { href: 'coupons', label: 'Cupones', icon: faTag },
  { href: 'content', label: 'Configuración', icon: faFileLines },
  { href: 'help', label: 'Manual', icon: faCircleQuestion },
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

          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#F4EF71] text-[#1E1E1E]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <FontAwesomeIcon icon={faHouse} className="w-4 h-4" />
          Ver sitio
        </Link>
      </div>
    </aside>
  )
}
