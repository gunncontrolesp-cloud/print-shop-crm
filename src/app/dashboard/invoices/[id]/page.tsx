import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendPaymentLink, deleteInvoice } from '@/lib/actions/invoices'
import { buttonVariants } from '@/components/ui/button-variants'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { FlashMessage } from '@/components/flash-message'
import { ResyncButton } from './ResyncButton'
import type { InvoiceStatus } from '@/lib/types'
import { Printer } from 'lucide-react'

const statusBadge: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ flash?: string }>
}) {
  const { id } = await params
  const { flash } = await searchParams
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, orders(id, total, customers(name, business_name, email))')
    .eq('id', id)
    .single()

  if (!invoice) notFound()

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
    isAdmin = ['admin', 'manager'].includes(profile?.role ?? '')
  }

  const order = Array.isArray(invoice.orders) ? invoice.orders[0] : invoice.orders
  const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers
  const currentStatus = invoice.status as InvoiceStatus

  const sendPaymentLinkAction = sendPaymentLink.bind(null, id)
  const deleteAction = deleteInvoice.bind(null, id)

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-4">
        <Link href="/dashboard/invoices" className="text-sm text-gray-500 hover:text-gray-900">
          ← Invoices
        </Link>
      </div>
      <FlashMessage message={flash} />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              Invoice #{id.slice(0, 8).toUpperCase()}
            </h1>
            <span
              className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${statusBadge[currentStatus]}`}
            >
              {currentStatus}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Created {new Date(invoice.created_at).toLocaleDateString('en-US')}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/print/invoice/${id}`}
            target="_blank"
            className={buttonVariants({ variant: 'outline' })}
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Print Invoice
          </Link>
          {isAdmin && (currentStatus === 'draft' || currentStatus === 'sent') && (
            <form action={sendPaymentLinkAction}>
              <button type="submit" className={buttonVariants()}>
                Send Payment Link
              </button>
            </form>
          )}
          {isAdmin && currentStatus === 'draft' && (
            <ConfirmDeleteButton action={deleteAction} />
          )}
        </div>
      </div>

      {/* Invoice details */}
      <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 mb-6">
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Amount</span>
          <span className="text-sm font-bold text-gray-900 text-lg">
            ${Number(invoice.amount).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Status</span>
          <span
            className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${statusBadge[currentStatus]}`}
          >
            {currentStatus}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Due Date</span>
          <span className="text-sm text-gray-700">
            {invoice.due_date
              ? new Date(invoice.due_date).toLocaleDateString('en-US')
              : 'Not set'}
          </span>
        </div>
        {invoice.stripe_payment_link_url && (
          <div className="flex justify-between px-4 py-3">
            <span className="text-sm text-gray-500">Payment Link</span>
            <a
              href={invoice.stripe_payment_link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate max-w-xs"
            >
              Open Stripe →
            </a>
          </div>
        )}
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-sm text-gray-500">Accounting Sync</span>
          <div className="flex items-center gap-3">
            {invoice.accounting_sync_status === 'synced' ? (
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-700">
                Synced {invoice.accounting_synced_at
                  ? new Date(invoice.accounting_synced_at).toLocaleDateString('en-US')
                  : ''}
              </span>
            ) : invoice.accounting_sync_status === 'failed' ? (
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-100 text-red-700">
                Failed
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-500">
                Pending
              </span>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-6">
          <ResyncButton invoiceId={id} />
        </div>
      )}

      {/* Linked order */}
      {order && (
        <div className="rounded-lg border border-gray-200 px-4 py-4 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Linked Order</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {customer?.name ?? 'Unknown Customer'}
              </p>
              {customer?.business_name && (
                <p className="text-xs text-gray-400">{customer.business_name}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <Link
              href={`/dashboard/orders/${order.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              View order →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
