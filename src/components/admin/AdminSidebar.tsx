'use client'

import { useState } from 'react'
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
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

interface NavItem {
  href: string
  label: string
  icon: IconDefinition
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const studioGroup: NavGroup = {
  label: 'Studio',
  items: [
    { href: 'schedule',  label: 'Clases',      icon: faCalendarDays },
    { href: 'packages',  label: 'Membresías',   icon: faBox },
    { href: 'coupons',   label: 'Cupones',      icon: faTag },
  ],
}

const usuariosGroup: NavGroup = {
  label: 'Usuarios',
  items: [
    { href: 'clients',     label: 'Clientes', icon: faUsers },
    { href: 'instructors', label: 'Coaches',  icon: faCircleUser },
    { href: 'admins',      label: 'Admins',   icon: faUserShield },
  ],
}

const sitioWebGroup: NavGroup = {
  label: 'Sitio web',
  items: [
    { href: 'contenido', label: 'Contenido',     icon: faImage },
    { href: 'content',   label: 'Configuración', icon: faFileLines },
  ],
}

const flatItems: NavItem[] = [
  { href: 'metrics', label: 'Métricas', icon: faChartBar },
]

const manualItem: NavItem = { href: 'help', label: 'Manual', icon: faCircleQuestion }

function NavLink({ item, locale, pathname }: { item: NavItem; locale: string; pathname: string }) {
  const href = `/${locale}/admin/${item.href}`
  const isActive = pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link
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
}

function NavGroupSection({
  group,
  locale,
  pathname,
}: {
  group: NavGroup
  locale: string
  pathname: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {group.label}
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`w-3 h-3 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} locale={locale} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminSidebar({
  locale,
  isAdmin = false,
  isCoach = false,
}: {
  locale: string
  isAdmin?: boolean
  isCoach?: boolean
}) {
  const pathname = usePathname()
  const coachOnly = isCoach && !isAdmin

  if (coachOnly) {
    return (
      <aside className="w-56 bg-white border-r border-border shrink-0 flex flex-col">
        <div className="p-4 border-b border-border">
          <p className="font-bold text-primary text-sm">Flex Room</p>
          <p className="text-xs text-muted-foreground">Coach</p>
        </div>
        <nav className="flex-1 p-3">
          <NavLink item={studioGroup.items[0]} locale={locale} pathname={pathname} />
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

      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        <NavGroupSection group={studioGroup} locale={locale} pathname={pathname} />
        <NavGroupSection group={usuariosGroup} locale={locale} pathname={pathname} />
        <NavGroupSection group={sitioWebGroup} locale={locale} pathname={pathname} />

        <div className="space-y-0.5">
          {flatItems.map((item) => (
            <NavLink key={item.href} item={item} locale={locale} pathname={pathname} />
          ))}
        </div>
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <NavLink item={manualItem} locale={locale} pathname={pathname} />
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
