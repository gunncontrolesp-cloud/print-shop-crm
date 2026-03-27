import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/lib/types'

const statusBadge: Record<OrderStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  printing: 'bg-yellow-100 text-yellow-700',
  finishing: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  delivered: 'bg-teal-100 text-teal-700',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: customerCount },
    { data: orders },
    { count: openQuoteCount },
    { count: unpaidInvoiceCount },
    { data: inventoryItems },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select('id, status, total, created_at, customers(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['draft', 'sent']),
    supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .in('status', ['draft', 'sent']),
    supabase.from('inventory_items').select('id, quantity, low_stock_threshold'),
  ])

  const lowStockCount = (inventoryItems ?? []).filter(
    (item) => Number(item.quantity) <= Number(item.low_stock_threshold)
  ).length

  const allOrders = orders ?? []

  const openOrderCount = allOrders.filter((o) => o.status !== 'delivered').length
  const pendingCount = allOrders.filter((o) => o.status === 'pending').length
  const inProductionCount = allOrders.filter(
    (o) => o.status === 'printing' || o.status === 'finishing'
  ).length
  const recentOrders = allOrders.slice(0, 5)

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <StatCard
          label="Total Customers"
          value={customerCount ?? 0}
          href="/dashboard/customers"
        />
        <StatCard
          label="Open Orders"
          value={openOrderCount}
          href="/dashboard/orders"
          accent="blue"
        />
        <StatCard
          label="Pending Approval"
          value={pendingCount}
          href="/dashboard/orders"
          accent="yellow"
        />
        <StatCard
          label="In Production"
          value={inProductionCount}
          href="/dashboard/orders"
          accent="orange"
        />
        <StatCard
          label="Unpaid Invoices"
          value={unpaidInvoiceCount ?? 0}
          href="/dashboard/invoices"
          accent="red"
        />
        <StatCard
          label="Low Stock Items"
          value={lowStockCount}
          href="/dashboard/inventory"
          accent="orange"
        />
      </div>

      {/* Recent orders + open quotes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders — takes 2 of 3 columns */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Recent Orders
            </h2>
            <Link
              href="/dashboard/orders"
              className="text-xs text-blue-600 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                    Customer
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                    Total
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                    Date
                  </th>
                  <th className="sr-only">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-400 text-sm"
                    >
                      No orders yet.{' '}
                      <Link
                        href="/dashboard/quotes/new"
                        className="text-blue-600 hover:underline"
                      >
                        Create a quote to get started.
                      </Link>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const customerName =
                      (Array.isArray(order.customers)
                        ? order.customers[0]
                        : order.customers
                      )?.name ?? 'Unknown'
                    const status = order.status as OrderStatus
                    return (
                      <tr key={order.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {customerName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block text-xs px-2 py-0.5 rounded capitalize font-medium ${statusBadge[status]}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          ${Number(order.total).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400 text-xs">
                          {new Date(order.created_at).toLocaleDateString('en-US')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Open quotes */}
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Open Quotes
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {openQuoteCount ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 mb-3">draft + sent</p>
            <Link
              href="/dashboard/quotes"
              className="text-xs text-blue-600 hover:underline"
            >
              View all quotes →
            </Link>
          </div>

          {/* Quick actions */}
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
              Quick Actions
            </p>
            <div className="space-y-2">
              <Link
                href="/dashboard/quotes/new"
                className="block w-full text-center text-sm font-medium text-white bg-gray-900 rounded-lg px-3 py-2 hover:bg-gray-700 transition-colors"
              >
                + New Quote
              </Link>
              <Link
                href="/dashboard/customers/new"
                className="block w-full text-center text-sm font-medium text-gray-700 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors"
              >
                + New Customer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string
  value: number
  href: string
  accent?: 'blue' | 'yellow' | 'orange' | 'red'
}) {
  const accentClass =
    accent === 'blue'
      ? 'text-blue-700'
      : accent === 'yellow'
      ? 'text-yellow-600'
      : accent === 'orange'
      ? 'text-orange-600'
      : accent === 'red'
      ? 'text-red-600'
      : 'text-gray-900'

  return (
    <Link
      href={href}
      className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accentClass}`}>{value}</p>
    </Link>
  )
}
