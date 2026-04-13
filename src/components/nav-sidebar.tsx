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
  Settings,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
  adminOnly?: boolean
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
      { label: 'Employees', href: '/dashboard/settings/employees', icon: UserCog, adminOnly: true },
      { label: 'Settings', href: '/dashboard/settings/pricing', icon: Settings, adminOnly: true },
    ],
  },
]

export function NavSidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const isAdmin = role === 'admin'

  return (
    <nav className="space-y-5">
      {NAV_GROUPS.map((group, gi) => {
        const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin)
        if (visibleItems.length === 0) return null

        return (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
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
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
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
