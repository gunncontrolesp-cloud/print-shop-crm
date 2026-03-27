import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { InvoiceStatus } from '@/lib/types'

const statusBadge: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
}

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, amount, status, due_date, created_at, orders(id, customers(name, business_name))')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Invoices</h1>

      {!invoices || invoices.length === 0 ? (
        <p className="text-sm text-gray-400">No invoices yet.</p>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Customer</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Invoice #</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Due Date</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Created</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const order = Array.isArray(inv.orders) ? inv.orders[0] : inv.orders
                const customer = Array.isArray(order?.customers)
                  ? order.customers[0]
                  : order?.customers
                const currentStatus = inv.status as InvoiceStatus

                return (
                  <tr key={inv.id} className="bg-white">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {customer?.name ?? '—'}
                      </span>
                      {customer?.business_name && (
                        <span className="block text-xs text-gray-400">
                          {customer.business_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {inv.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${Number(inv.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${statusBadge[currentStatus]}`}
                      >
                        {currentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString('en-US')
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(inv.created_at).toLocaleDateString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View →
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
