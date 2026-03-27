'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', exact: true },
  { label: 'Customers', href: '/dashboard/customers' },
  { label: 'Quotes', href: '/dashboard/quotes' },
  { label: 'Orders', href: '/dashboard/orders' },
  { label: 'Production', href: '/dashboard/production' },
  { label: 'Inventory', href: '/dashboard/inventory' },
  { label: 'Invoices', href: '/dashboard/invoices' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Settings', href: '/dashboard/settings/pricing' },
]

export function NavSidebar() {
  const pathname = usePathname()

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
