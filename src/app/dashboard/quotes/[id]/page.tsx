import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateQuoteStatus, deleteQuote, updateQuoteExpiryAction, sendQuoteReminder } from '@/lib/actions/quotes'
import type { LineItem } from '@/lib/types'
import { convertQuoteToOrder } from '@/lib/actions/orders'
import { buttonVariants } from '@/components/ui/button-variants'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, customers(name, business_name, id)')
    .eq('id', id)
    .single()


  if (!quote) notFound()

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
    isAdmin = profile?.role === 'admin'
    isElevated = ['admin', 'manager'].includes(profile?.role ?? '')
  }

  const lineItems = (quote.line_items ?? []) as LineItem[]
  const customer = quote.customers as { name: string; business_name: string | null; id: string } | null

  const markSentAction = updateQuoteStatus.bind(null, id, 'sent')
  const approveAction = updateQuoteStatus.bind(null, id, 'approved')
  const rejectAction = updateQuoteStatus.bind(null, id, 'rejected')
  const deleteAction = deleteQuote.bind(null, id)
  const convertAction = convertQuoteToOrder.bind(null, id)
  const sendReminderAction = sendQuoteReminder.bind(null, id)

  const reminderSentAt = quote.reminder_sent_at ? new Date(quote.reminder_sent_at as string) : null
  const hoursSinceReminder = reminderSentAt ? (Date.now() - reminderSentAt.getTime()) / 3600000 : null
  const canRemind = ['pending', 'sent'].includes(quote.status) && (hoursSinceReminder === null || hoursSinceReminder >= 48)
  const reminderCoolingDown = ['pending', 'sent'].includes(quote.status) && hoursSinceReminder !== null && hoursSinceReminder < 48

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-4">
        <Link href="/dashboard/quotes" className="text-sm text-gray-500 hover:text-gray-900">
          ← Quotes
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900">
              {customer?.name ?? 'Unknown Customer'}
            </h1>
            <span
              className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${statusStyles[quote.status] ?? ''}`}
            >
              {quote.status}
            </span>
            {quote.expires_at && (() => {
              const now = Date.now()
              const exp = new Date(quote.expires_at).getTime()
              const sevenDays = 7 * 24 * 60 * 60 * 1000
              if (exp < now) return <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-100 text-red-600">Expired</span>
              if (exp < now + sevenDays) return <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700">Expires soon</span>
              return <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-500">Expires {new Date(quote.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            })()}
          </div>
          {customer?.business_name && (
            <p className="text-gray-500 mt-0.5 text-sm">{customer.business_name}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Quote #{id.slice(0, 8).toUpperCase()} ·{' '}
            {new Date(quote.created_at).toLocaleDateString('en-US')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap justify-end">
          {quote.status === 'approved' && (
            <form action={convertAction}>
              <button type="submit" className={buttonVariants()}>
                Convert to Order
              </button>
            </form>
          )}
          {quote.status === 'draft' && (
            <form action={markSentAction}>
              <button type="submit" className={buttonVariants()}>
                Mark as Sent
              </button>
            </form>
          )}
          {quote.status === 'sent' && isElevated && (
            <>
              <form action={approveAction}>
                <button
                  type="submit"
                  className={buttonVariants({ variant: 'default' })}
                >
                  Approve
                </button>
              </form>
              <form action={rejectAction}>
                <button
                  type="submit"
                  className={buttonVariants({ variant: 'outline' })}
                >
                  Reject
                </button>
              </form>
            </>
          )}
          {isElevated && canRemind && (
            <form action={sendReminderAction}>
              <button
                type="submit"
                className={buttonVariants({ variant: 'outline' })}
              >
                Send Reminder
              </button>
            </form>
          )}
          {isElevated && reminderCoolingDown && (
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-200 rounded-md">
              Sent {Math.floor(hoursSinceReminder!)}h ago
            </span>
          )}
          {isAdmin && (
            <ConfirmDeleteButton action={deleteAction} />
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-lg border border-gray-200 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Description</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Qty</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Material</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Finishing</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Unit Price</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No line items
                </td>
              </tr>
            ) : (
              lineItems.map((item) => (
                <tr key={item.id} className="bg-white">
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.qty}</td>
                  <td className="px-4 py-3 text-right text-gray-600 text-xs">
                    {item.material_id
                      ? `${item.material_id} ×${item.material_multiplier.toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 text-xs">
                    {item.finishing_id
                      ? `${item.finishing_id} ×${item.finishing_multiplier.toFixed(2)}`
                      : '—'}
                  </td>
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
              <td colSpan={5} className="px-4 py-3 text-right font-semibold text-gray-700">
                Subtotal
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">
                ${Number(quote.subtotal).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}

      {/* Extend expiry — elevated only */}
      {isElevated && quote.status !== 'approved' && quote.status !== 'rejected' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Expiry Date</p>
          <form action={updateQuoteExpiryAction} className="flex items-center gap-3">
            <input type="hidden" name="id" value={id} />
            <input
              type="date"
              name="expires_at"
              defaultValue={quote.expires_at ? new Date(quote.expires_at).toISOString().slice(0, 10) : ''}
              className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded hover:bg-gray-700 transition-colors"
            >
              Save
            </button>
          </form>
        </div>
      )}

      {/* Customer link */}
      {customer && (
        <Link
          href={`/dashboard/customers/${customer.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          View customer →
        </Link>
      )}
    </div>
  )
}
