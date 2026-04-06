'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const allNavItems = [
  { label: 'Dashboard', href: '/dashboard', exact: true },
  { label: 'Customers', href: '/dashboard/customers' },
  { label: 'Quotes', href: '/dashboard/quotes' },
  { label: 'Orders', href: '/dashboard/orders' },
  { label: 'Production', href: '/dashboard/production' },
  { label: 'Time Clock', href: '/dashboard/timeclock' },

  { label: 'Invoices', href: '/dashboard/invoices' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Product Catalog', href: '/dashboard/settings/catalog', adminOnly: true },
  { label: 'Employees', href: '/dashboard/settings/employees', adminOnly: true },
  { label: 'Settings', href: '/dashboard/settings/pricing', adminOnly: true },
]

export function NavSidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const navItems = allNavItems.filter((item) => !item.adminOnly || role === 'admin')

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
              isActive
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
