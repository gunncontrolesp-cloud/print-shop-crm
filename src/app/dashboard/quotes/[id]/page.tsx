import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateQuoteStatus, deleteQuote, updateQuoteExpiryAction, sendQuoteReminder } from '@/lib/actions/quotes'
import type { LineItem } from '@/lib/types'
import { convertQuoteToOrder } from '@/lib/actions/orders'
import { buttonVariants } from '@/components/ui/button-variants'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { FlashMessage } from '@/components/flash-message'

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  sent: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
}

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ flash?: string }>
}) {
  const { id } = await params
  const { flash } = await searchParams
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
    isAdmin = ['admin', 'manager'].includes(profile?.role ?? '')
    isElevated = isAdmin
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
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-4">
        <Link href="/dashboard/quotes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Quotes
        </Link>
      </div>
      <FlashMessage message={flash} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">
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
              return <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-500">Expires {new Date(quote.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            })()}
          </div>
          {customer?.business_name && (
            <p className="text-muted-foreground mt-0.5 text-sm">{customer.business_name}</p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1">
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
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-muted-foreground/60 border border-border rounded-md">
              Sent {Math.floor(hoursSinceReminder!)}h ago
            </span>
          )}
          {isAdmin && (
            <ConfirmDeleteButton action={deleteAction} />
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-lg border border-border overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Qty</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Material</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Finishing</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Unit Price</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground/60">
                  No line items
                </td>
              </tr>
            ) : (
              lineItems.map((item) => (
                <tr key={item.id} className="bg-card">
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{item.qty}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                    {item.material_id
                      ? `${item.material_id} ×${item.material_multiplier.toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                    {item.finishing_id
                      ? `${item.finishing_id} ×${item.finishing_multiplier.toFixed(2)}`
                      : '—'}
                  </td>
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
              <td colSpan={5} className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Subtotal
              </td>
              <td className="px-4 py-3 text-right font-bold text-foreground text-base">
                ${Number(quote.subtotal).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}

      {/* Extend expiry — elevated only */}
      {isElevated && quote.status !== 'approved' && quote.status !== 'rejected' && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Expiry Date</p>
          <form action={updateQuoteExpiryAction} className="flex items-center gap-3">
            <input type="hidden" name="id" value={id} />
            <input
              type="date"
              name="expires_at"
              defaultValue={quote.expires_at ? new Date(quote.expires_at).toISOString().slice(0, 10) : ''}
              className="rounded border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-card"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium text-primary-foreground bg-foreground rounded hover:bg-foreground/80 transition-colors"
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
          className="text-sm text-primary hover:underline"
        >
          View customer →
        </Link>
      )}
    </div>
  )
}
