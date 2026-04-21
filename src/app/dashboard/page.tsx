import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Users, ShoppingCart, AlertCircle, Layers, Receipt,
  AlertTriangle, FileText, ArrowRight, Plus,
} from 'lucide-react'
import type { OrderStatus } from '@/lib/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending:  { label: 'Pending',   className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  approved: { label: 'Approved',  className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  printing: { label: 'Printing',  className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  finishing:{ label: 'Finishing', className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  completed:{ label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  delivered:{ label: 'Delivered', className: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
}

const COLOR_MAP = {
  slate:  { bg: 'bg-slate-100',  icon: 'text-slate-600',  value: 'text-slate-900' },
  indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600', value: 'text-indigo-700' },
  amber:  { bg: 'bg-amber-100',  icon: 'text-amber-600',  value: 'text-amber-700' },
  violet: { bg: 'bg-violet-100', icon: 'text-violet-600', value: 'text-violet-700' },
  rose:   { bg: 'bg-rose-100',   icon: 'text-rose-600',   value: 'text-rose-700' },
  orange: { bg: 'bg-orange-100', icon: 'text-orange-600', value: 'text-orange-700' },
}

function StatCard({
  label, value, href, icon: Icon, color,
}: {
  label: string; value: number; href: string
  icon: React.ElementType; color: keyof typeof COLOR_MAP
}) {
  const c = COLOR_MAP[color]
  return (
    <Link href={href} className="animate-fade-up block bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-slate-300 active:scale-[0.97] transition-[box-shadow,border-color,transform] duration-200">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${c.bg} mb-3`}>
        <Icon className={`h-4 w-4 ${c.icon}`} />
      </div>
      <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
    </Link>
  )
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
    supabase.from('orders').select('id, status, total, created_at, customers(name)').order('created_at', { ascending: false }),
    supabase.from('quotes').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
    supabase.from('inventory_items').select('id, quantity, low_stock_threshold'),
  ])

  const lowStockCount = (inventoryItems ?? []).filter(
    (item) => Number(item.quantity) <= Number(item.low_stock_threshold)
  ).length

  const allOrders = orders ?? []
  const openOrderCount    = allOrders.filter((o) => o.status !== 'delivered').length
  const pendingCount      = allOrders.filter((o) => o.status === 'pending').length
  const inProductionCount = allOrders.filter((o) => o.status === 'printing' || o.status === 'finishing').length
  const recentOrders      = allOrders.slice(0, 6)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/customers/new" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-[0.97] transition-[background-color,transform] duration-150 shadow-sm">
            <Plus className="h-3.5 w-3.5" /> New Customer
          </Link>
          <Link href="/dashboard/quotes/new" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:scale-[0.97] transition-[background-color,transform] duration-150 shadow-sm">
            <Plus className="h-3.5 w-3.5" /> New Quote
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8">
        <StatCard label="Customers"       value={customerCount ?? 0}     href="/dashboard/customers"   icon={Users}         color="slate"  />
        <StatCard label="Open Orders"     value={openOrderCount}          href="/dashboard/orders"      icon={ShoppingCart}  color="indigo" />
        <StatCard label="Needs Approval"  value={pendingCount}            href="/dashboard/orders"      icon={AlertCircle}   color="amber"  />
        <StatCard label="In Production"   value={inProductionCount}       href="/dashboard/production"  icon={Layers}        color="violet" />
        <StatCard label="Unpaid Invoices" value={unpaidInvoiceCount ?? 0} href="/dashboard/invoices"    icon={Receipt}       color="rose"   />
        <StatCard label="Low Stock"       value={lowStockCount}           href="/dashboard/inventory"   icon={AlertTriangle} color="orange" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Recent Orders</h2>
            <Link href="/dashboard/orders" className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="sr-only">View</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                    No orders yet.{' '}
                    <Link href="/dashboard/quotes/new" className="text-indigo-600 hover:underline">
                      Create a quote to get started.
                    </Link>
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => {
                  const customerName =
                    (Array.isArray(order.customers) ? order.customers[0] : order.customers)?.name ?? 'Unknown'
                  const status = order.status as OrderStatus
                  const cfg = STATUS_CONFIG[status]
                  return (
                    <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-900">{customerName}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-700 font-medium">
                        ${Number(order.total).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400 text-xs">
                        {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/dashboard/orders/${order.id}`} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <FileText className="h-4 w-4 text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Open Quotes</p>
              </div>
              <span className="text-2xl font-bold text-slate-900">{openQuoteCount ?? 0}</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Draft and sent — awaiting approval</p>
            <Link href="/dashboard/quotes" className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              View all quotes <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</p>
            <div className="space-y-2">
              <Link href="/dashboard/quotes/new" className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:scale-[0.97] transition-[background-color,transform] duration-150">
                <Plus className="h-4 w-4" /> New Quote
              </Link>
              <Link href="/dashboard/customers/new" className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-[0.97] transition-[background-color,transform] duration-150">
                <Plus className="h-4 w-4" /> New Customer
              </Link>
              <Link href="/dashboard/production" className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-[0.97] transition-[background-color,transform] duration-150">
                <Layers className="h-4 w-4" /> Production Board
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
