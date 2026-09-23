'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faBox,
  faUsers,
  faFileLines,
  faCircleUser,
  faChartBar,
  faHouse,
  faTag,
  faCircleQuestion,
  faImage,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

interface NavItem {
  href: string
  label: string
  icon: IconDefinition
  indent?: boolean
}

const topItems: NavItem[] = [
  { href: 'schedule', label: 'Clases', icon: faCalendarDays },
  { href: 'packages', label: 'Membresías', icon: faBox },
]

const usuariosItems: NavItem[] = [
  { href: 'clients', label: 'Clientes', icon: faUsers, indent: true },
  { href: 'instructors', label: 'Coaches', icon: faCircleUser, indent: true },
  { href: 'admins', label: 'Admins', icon: faUserShield, indent: true },
]

const bottomItems: NavItem[] = [
  { href: 'metrics', label: 'Métricas', icon: faChartBar },
  { href: 'coupons', label: 'Cupones', icon: faTag },
  { href: 'contenido', label: 'Contenido', icon: faImage },
  { href: 'content', label: 'Configuración', icon: faFileLines },
  { href: 'help', label: 'Manual', icon: faCircleQuestion },
]

function NavLink({ item, locale, pathname }: { item: NavItem; locale: string; pathname: string }) {
  const href = `/${locale}/admin/${item.href}`
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        item.indent ? 'ml-3' : ''
      } ${
        isActive
          ? 'bg-[#F4EF71] text-[#1E1E1E]'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      <FontAwesomeIcon icon={item.icon} className="w-4 h-4 shrink-0" />
      {item.label}
    </Link>
  )
}

export default function AdminSidebar({ locale, isAdmin = false, isCoach = false }: { locale: string; isAdmin?: boolean; isCoach?: boolean }) {
  const pathname = usePathname()
  const coachOnly = isCoach && !isAdmin

  if (coachOnly) {
    return (
      <aside className="w-56 bg-white border-r border-border shrink-0 flex flex-col">
        <div className="p-4 border-b border-border">
          <p className="font-bold text-primary text-sm">Flex Room</p>
          <p className="text-xs text-muted-foreground">Coach</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink item={topItems[0]} locale={locale} pathname={pathname} />
        </nav>
        <div className="p-3 border-t border-border">
          <Link href={`/${locale}`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary">
            <FontAwesomeIcon icon={faHouse} className="w-4 h-4" />
            Ver sitio
          </Link>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-56 bg-white border-r border-border shrink-0 flex flex-col">
      <div className="p-4 border-b border-border">
        <p className="font-bold text-primary text-sm">Flex Room</p>
        <p className="text-xs text-muted-foreground">Admin Panel</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {topItems.map((item) => (
          <NavLink key={item.href} item={item} locale={locale} pathname={pathname} />
        ))}

        {/* Usuarios group */}
        <div className="pt-2 pb-1">
          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuarios</p>
          <div className="space-y-1">
            {usuariosItems.map((item) => (
              <NavLink key={item.href} item={item} locale={locale} pathname={pathname} />
            ))}
          </div>
        </div>

        {bottomItems.map((item) => (
          <NavLink key={item.href} item={item} locale={locale} pathname={pathname} />
        ))}
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
