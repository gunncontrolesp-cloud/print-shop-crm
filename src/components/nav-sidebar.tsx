'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
  Layers,
  Clock,
  ClipboardList,
  BarChart2,
  Receipt,
  TrendingUp,
  Package,
  UserCog,
  Monitor,
  Settings,
  BookOpen,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
  adminOnly?: boolean
  strictAdminOnly?: boolean
}

const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Customers', href: '/dashboard/customers', icon: Users },
      { label: 'Quotes', href: '/dashboard/quotes', icon: FileText },
      { label: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
      { label: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Production', href: '/dashboard/production', icon: Layers },
      { label: 'Time Clock', href: '/dashboard/timeclock', icon: Clock, exact: true },
      { label: 'Timecards', href: '/dashboard/timeclock/admin', icon: ClipboardList, adminOnly: true },
      { label: 'Time Reports', href: '/dashboard/timeclock/reports', icon: BarChart2, adminOnly: true },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp, adminOnly: true },
      { label: 'Product Catalog', href: '/dashboard/settings/catalog', icon: Package, adminOnly: true },
      { label: 'Employees', href: '/dashboard/settings/employees', icon: UserCog, strictAdminOnly: true },
      { label: 'Kiosk Staff', href: '/dashboard/settings/staff', icon: Monitor, adminOnly: true },
      { label: 'Settings', href: '/dashboard/settings/pricing', icon: Settings, strictAdminOnly: true },
      { label: 'Accounting', href: '/dashboard/settings/accounting', icon: BookOpen, strictAdminOnly: true },
      { label: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard, strictAdminOnly: true },
    ],
  },
]

export function NavSidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const isAdmin = role === 'admin'
  const isElevated = ['admin', 'manager'].includes(role)

  return (
    <nav className="space-y-5">
      {NAV_GROUPS.map((group, gi) => {
        const visibleItems = group.items.filter(
          (item) => (!item.adminOnly || isElevated) && (!item.strictAdminOnly || isAdmin)
        )
        if (visibleItems.length === 0) return null

        return (
          <div key={gi}>
            {group.label && (
              <p className="px-2 mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/70">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {visibleItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-2 py-[7px] rounded text-[12px] font-medium transition-[background-color,color] duration-150',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-[0.98]'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
