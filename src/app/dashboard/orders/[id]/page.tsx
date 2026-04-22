import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateOrderStatus, deleteOrder, archiveOrder } from '@/lib/actions/orders'
import { createInvoice } from '@/lib/actions/invoices'
import { resetProofDecision } from '@/lib/actions/proof'
import type { OrderStatus, LineItem, InvoiceStatus } from '@/lib/types'
import { getNextStatus } from '@/lib/types'
import { buttonVariants } from '@/components/ui/button-variants'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
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
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  printing: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  finishing: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  delivered: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
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
  let isElevated = false
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = ['admin', 'manager'].includes(profile?.role ?? '')
    isElevated = isAdmin
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

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, amount, status, due_date')
    .eq('order_id', id)
    .single()

  const { data: job } = await supabase
    .from('jobs')
    .select('id, stage, proof_decision, proof_comments')
    .eq('order_id', id)
    .is('completed_at', null)
    .maybeSingle()

  const currentIdx = STATUS_SEQUENCE.indexOf(currentStatus)

  const nextAction = nextStatus
    ? updateOrderStatus.bind(null, id, nextStatus)
    : null
  const deleteAction = deleteOrder.bind(null, id)
  const archiveAction = archiveOrder.bind(null, id)
  const resetProofAction = job?.proof_decision === 'changes_requested'
    ? resetProofDecision.bind(null, job.id)
    : null

  const canAdvance =
    nextStatus !== null &&
    (nextStatus !== 'approved' || isElevated)

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-4">
        <Link href="/dashboard/orders" className="text-sm text-muted-foreground hover:text-foreground">
          ← Orders
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {customer?.name ?? 'Unknown Customer'}
            </h1>
            <span
              className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${statusBadge[currentStatus]}`}
            >
              {currentStatus}
            </span>
          </div>
          {customer?.business_name && (
            <p className="text-muted-foreground mt-0.5 text-sm">{customer.business_name}</p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1">
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
          {isAdmin && !order.archived_at && (
            <form action={archiveAction}>
              <button type="submit" className={buttonVariants({ variant: 'outline' as 'default' })}>
                Archive
              </button>
            </form>
          )}
          {isAdmin && (
            <ConfirmDeleteButton action={deleteAction} />
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
                    ? 'bg-foreground text-background'
                    : isPast
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-muted/40 text-muted-foreground/40 border border-border'
                }`}
              >
                {isPast && <span>✓</span>}
                {STATUS_LABELS[stage]}
              </div>
              {idx < STATUS_SEQUENCE.length - 1 && (
                <span className={`text-xs ${isPast ? 'text-muted-foreground' : 'text-border'}`}>
                  →
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Line Items */}
      <div className="rounded-lg border border-border overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Qty</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Unit Price</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground/60">
                  No line items
                </td>
              </tr>
            ) : (
              lineItems.map((item) => (
                <tr key={item.id} className="bg-card">
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{item.qty}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
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
            <tr className="bg-muted/40 border-t border-border">
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Total
              </td>
              <td className="px-4 py-3 text-right font-bold text-foreground text-base">
                ${Number(order.total).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Proof status */}
      {job && job.stage === 'proofing' && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Proof Approval</h2>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            {!job.proof_decision && (
              <p className="text-sm text-muted-foreground">Awaiting customer review.</p>
            )}
            {job.proof_decision === 'approved' && (
              <p className="text-sm text-green-700 font-medium">✓ Customer approved the proof</p>
            )}
            {job.proof_decision === 'changes_requested' && (
              <div className="space-y-2">
                <p className="text-sm text-orange-700 font-medium">Customer requested changes</p>
                {job.proof_comments && (
                  <p className="text-sm text-orange-800 bg-orange-50 rounded px-3 py-2">
                    {job.proof_comments}
                  </p>
                )}
                {resetProofAction && (
                  <form action={resetProofAction}>
                    <button
                      type="submit"
                      className="mt-1 text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted/60 font-medium transition-colors"
                    >
                      Upload new proof &amp; reset for review
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Invoice</h2>
        {invoice ? (
          <div className="rounded-lg border border-border px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-foreground">
                #{invoice.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="ml-3 text-sm text-foreground">${Number(invoice.amount).toFixed(2)}</span>
              <span
                className={`ml-3 text-xs px-2 py-0.5 rounded capitalize font-medium ${
                  (invoice.status as InvoiceStatus) === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : (invoice.status as InvoiceStatus) === 'sent'
                    ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {invoice.status}
              </span>
              {invoice.due_date && (
                <span className="ml-3 text-xs text-muted-foreground/60">
                  Due {new Date(invoice.due_date).toLocaleDateString('en-US')}
                </span>
              )}
            </div>
            <Link
              href={`/dashboard/invoices/${invoice.id}`}
              className="text-sm text-primary hover:underline"
            >
              View invoice →
            </Link>
          </div>
        ) : isAdmin ? (
          <form action={createInvoice.bind(null, id)}>
            <button type="submit" className={buttonVariants({ variant: 'outline' as 'default' })}>
              Generate Invoice
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground/60">No invoice yet.</p>
        )}
      </div>

      {/* Files */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Files</h2>
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
            className="text-primary hover:underline"
          >
            View customer →
          </Link>
        )}
        {order.quote_id && (
          <Link
            href={`/dashboard/quotes/${order.quote_id}`}
            className="text-primary hover:underline"
          >
            View source quote →
          </Link>
        )}
      </div>
    </div>
  )
}
