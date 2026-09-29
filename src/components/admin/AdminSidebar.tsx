'use client'

import { useState, useEffect, useRef } from 'react'
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
  faBars,
  faXmark,
  faMoneyBill,
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

const finanzasGroup: NavGroup = {
  label: 'Finanzas',
  items: [
    { href: 'payroll', label: 'Nómina', icon: faMoneyBill },
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const prevPathname = useRef(pathname)
  const coachOnly = isCoach && !isAdmin

  // Auto-close drawer on navigation
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      setMobileOpen(false)
      prevPathname.current = pathname
    }
  }, [pathname])

  // Derive current page label for the mobile top bar
  const allItems = [
    ...studioGroup.items,
    ...usuariosGroup.items,
    ...sitioWebGroup.items,
    ...finanzasGroup.items,
    ...flatItems,
    manualItem,
  ]
  const activeItem = allItems.find((item) => {
    const href = `/${locale}/admin/${item.href}`
    return pathname === href || pathname.startsWith(`${href}/`)
  })
  const pageTitle = activeItem?.label ?? (coachOnly ? 'Coach' : 'Admin')

  const sidebarInner = coachOnly ? (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="font-bold text-primary text-sm">Flex Room</p>
          <p className="text-xs text-muted-foreground">Coach</p>
        </div>
        <button
          className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-secondary"
          onClick={() => setMobileOpen(false)}
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
        </button>
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
    </>
  ) : (
    <>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="font-bold text-primary text-sm">Flex Room</p>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/${locale}/admin/${manualItem.href}`}
            title="Manual"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              pathname === `/${locale}/admin/${manualItem.href}`
                ? 'bg-[#F4EF71] text-[#1E1E1E]'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <FontAwesomeIcon icon={faCircleQuestion} className="w-4 h-4" />
          </Link>
          <Link
            href={`/${locale}`}
            title="Ver sitio"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <FontAwesomeIcon icon={faHouse} className="w-4 h-4" />
          </Link>
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            onClick={() => setMobileOpen(false)}
          >
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        <NavGroupSection group={studioGroup} locale={locale} pathname={pathname} />
        <NavGroupSection group={usuariosGroup} locale={locale} pathname={pathname} />
        <NavGroupSection group={sitioWebGroup} locale={locale} pathname={pathname} />
        <NavGroupSection group={finanzasGroup} locale={locale} pathname={pathname} />

        <div className="space-y-0.5">
          {flatItems.map((item) => (
            <NavLink key={item.href} item={item} locale={locale} pathname={pathname} />
          ))}
        </div>
      </nav>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-border flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-primary truncate">{pageTitle}</p>
        </div>
        <Link
          href={`/${locale}`}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <FontAwesomeIcon icon={faHouse} className="w-4 h-4" />
        </Link>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col
        transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-56 md:z-auto md:shrink-0
      `}>
        {sidebarInner}
      </aside>
    </>
  )
}
