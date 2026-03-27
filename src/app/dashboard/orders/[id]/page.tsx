import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateOrderStatus, deleteOrder } from '@/lib/actions/orders'
import type { OrderStatus, LineItem } from '@/lib/types'
import { getNextStatus } from '@/lib/types'
import { buttonVariants } from '@/components/ui/button-variants'
import { OrderFilesPanel } from '@/components/file-uploader'

const STATUS_SEQUENCE: OrderStatus[] = [
  'pending',
  'approved',
  'printing',
  'finishing',
  'completed',
  'delivered',
]

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  printing: 'Printing',
  finishing: 'Finishing',
  completed: 'Completed',
  delivered: 'Delivered',
}

const NEXT_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: 'Approve',
  approved: 'Start Printing',
  printing: 'Move to Finishing',
  finishing: 'Mark Completed',
  completed: 'Mark Delivered',
}

const statusBadge: Record<OrderStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  printing: 'bg-yellow-100 text-yellow-700',
  finishing: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  delivered: 'bg-teal-100 text-teal-700',
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, customers(name, business_name, id)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  const currentStatus = order.status as OrderStatus
  const nextStatus = getNextStatus(currentStatus)
  const lineItems = (order.line_items ?? []) as LineItem[]
  const customer = (
    Array.isArray(order.customers) ? order.customers[0] : order.customers
  ) as { name: string; business_name: string | null; id: string } | null

  const { data: files } = await supabase
    .from('files')
    .select('id, name, size_bytes, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  const currentIdx = STATUS_SEQUENCE.indexOf(currentStatus)

  const nextAction = nextStatus
    ? updateOrderStatus.bind(null, id, nextStatus)
    : null
  const deleteAction = deleteOrder.bind(null, id)

  const canAdvance =
    nextStatus !== null &&
    (nextStatus !== 'approved' || isAdmin)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-4">
        <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:text-gray-900">
          ← Orders
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {customer?.name ?? 'Unknown Customer'}
            </h1>
            <span
              className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${statusBadge[currentStatus]}`}
            >
              {currentStatus}
            </span>
          </div>
          {customer?.business_name && (
            <p className="text-gray-500 mt-0.5 text-sm">{customer.business_name}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Order #{id.slice(0, 8).toUpperCase()} ·{' '}
            {new Date(order.created_at).toLocaleDateString('en-US')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap justify-end">
          {canAdvance && nextStatus && nextAction && (
            <form action={nextAction}>
              <button type="submit" className={buttonVariants()}>
                {NEXT_ACTION_LABELS[currentStatus] ?? `Move to ${STATUS_LABELS[nextStatus]}`}
              </button>
            </form>
          )}
          {currentStatus === 'delivered' && (
            <span className="inline-flex items-center px-3 py-1.5 text-sm text-teal-700 font-medium">
              Delivered ✓
            </span>
          )}
          {isAdmin && currentStatus !== 'delivered' && (
            <form action={deleteAction}>
              <button type="submit" className={buttonVariants({ variant: 'destructive' })}>
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Status progress */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
        {STATUS_SEQUENCE.map((stage, idx) => {
          const isPast = idx < currentIdx
          const isCurrent = idx === currentIdx
          const isFuture = idx > currentIdx
          return (
            <div key={stage} className="flex items-center gap-1 shrink-0">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isCurrent
                    ? 'bg-gray-900 text-white'
                    : isPast
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-gray-50 text-gray-300 border border-gray-200'
                }`}
              >
                {isPast && <span>✓</span>}
                {STATUS_LABELS[stage]}
              </div>
              {idx < STATUS_SEQUENCE.length - 1 && (
                <span className={`text-xs ${isPast ? 'text-gray-400' : 'text-gray-200'}`}>
                  →
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Line Items */}
      <div className="rounded-lg border border-gray-200 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Description</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Qty</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Unit Price</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No line items
                </td>
              </tr>
            ) : (
              lineItems.map((item) => (
                <tr key={item.id} className="bg-white">
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.qty}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    ${item.unit_price.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${item.line_total.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700">
                Total
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">
                ${Number(order.total).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Files */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Files</h2>
        <OrderFilesPanel
          orderId={id}
          files={files ?? []}
          isAdmin={isAdmin}
        />
      </div>

      {/* Links */}
      <div className="flex gap-4 text-sm">
        {customer && (
          <Link
            href={`/dashboard/customers/${customer.id}`}
            className="text-blue-600 hover:underline"
          >
            View customer →
          </Link>
        )}
        {order.quote_id && (
          <Link
            href={`/dashboard/quotes/${order.quote_id}`}
            className="text-blue-600 hover:underline"
          >
            View source quote →
          </Link>
        )}
      </div>
    </div>
  )
}
