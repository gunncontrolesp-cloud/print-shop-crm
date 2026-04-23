import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { SearchInput } from '@/components/search-input'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Pending',   className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  approved: { label: 'Approved',  className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  printing: { label: 'Printing',  className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  finishing:{ label: 'Finishing', className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  completed:{ label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  delivered:{ label: 'Delivered', className: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total, created_at, customers(name, business_name)')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  const ql = q.toLowerCase()
  const filtered = (orders ?? []).filter((order) => {
    if (!ql) return true
    const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers
    return (
      customer?.name?.toLowerCase().includes(ql) ||
      customer?.business_name?.toLowerCase().includes(ql) ||
      order.id.toLowerCase().includes(ql) ||
      order.status.toLowerCase().includes(ql)
    )
  })

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} {ql ? 'results' : 'active orders'}
          </p>
        </div>
        <Suspense fallback={<div className="w-64 h-9 bg-slate-100 rounded-lg animate-pulse" />}>
          <SearchInput placeholder="Search by customer or status…" />
        </Suspense>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border">
          <div className="flex flex-col items-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
              <ShoppingCart className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              {ql ? 'No orders match your search' : 'No orders yet'}
            </p>
            <p className="text-sm text-slate-400">
              {ql ? 'Try a different search term.' : (
                <>Orders are created by converting an{' '}
                <Link href="/dashboard/quotes" className="text-primary hover:underline">approved quote</Link>.</>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Order</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const customer = (
                  Array.isArray(order.customers) ? order.customers[0] : order.customers
                ) as { name: string; business_name: string | null } | null
                const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, className: 'bg-slate-100 text-slate-600' }
                return (
                  <tr key={order.id} className="border-b border-border/30 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400 hidden sm:table-cell">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-900">{customer?.name ?? '—'}</span>
                      {customer?.business_name && (
                        <span className="block text-xs text-slate-400">{customer.business_name}</span>
                      )}
                      <span className="block text-xs text-slate-300 font-mono sm:hidden">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                      ${Number(order.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs hidden md:table-cell">
                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                      >
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
