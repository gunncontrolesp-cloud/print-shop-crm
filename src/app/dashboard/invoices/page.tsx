import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Receipt, ArrowRight } from 'lucide-react'
import type { InvoiceStatus } from '@/lib/types'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  sent:  { label: 'Sent',  className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  paid:  { label: 'Paid',  className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
}

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, amount, status, due_date, created_at, accounting_sync_status, orders(id, customers(name, business_name))')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">{invoices?.length ?? 0} total</p>
        </div>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Receipt className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No invoices yet</p>
            <p className="text-sm text-slate-400">
              Invoices are generated from completed orders.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice #</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Sync</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const order = Array.isArray(inv.orders) ? inv.orders[0] : inv.orders
                const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers
                const cfg = STATUS_CONFIG[inv.status as InvoiceStatus] ?? { label: inv.status, className: 'bg-slate-100 text-slate-600' }
                return (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-900">{customer?.name ?? '—'}</span>
                      {customer?.business_name && (
                        <span className="block text-xs text-slate-400">{customer.business_name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                      #{inv.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                      ${Number(inv.amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      {inv.accounting_sync_status === 'synced' ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          Synced
                        </span>
                      ) : inv.accounting_sync_status === 'failed' ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">
                          Failed
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
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
