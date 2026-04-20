import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { FileText, Plus, ArrowRight } from 'lucide-react'
import { SearchInput } from '@/components/search-input'

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-xs text-slate-400">—</span>
  const now = Date.now()
  const exp = new Date(expiresAt).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (exp < now) {
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-rose-50 text-rose-700 ring-1 ring-rose-200">Expired</span>
  }
  if (exp < now + sevenDays) {
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">Expires soon</span>
  }
  return (
    <span className="text-xs text-slate-500">
      {new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
    </span>
  )
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:    { label: 'Draft',    className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  sent:     { label: 'Sent',     className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const supabase = await createClient()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, subtotal, created_at, expires_at, is_reorder, customers(name, business_name)')
    .order('created_at', { ascending: false })

  const ql = q.toLowerCase()
  const filtered = (quotes ?? []).filter((quote) => {
    if (!ql) return true
    const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers
    return (
      customer?.name?.toLowerCase().includes(ql) ||
      customer?.business_name?.toLowerCase().includes(ql) ||
      quote.id.toLowerCase().includes(ql) ||
      quote.status.toLowerCase().includes(ql)
    )
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} {ql ? 'results' : 'total'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={<div className="w-64 h-9 bg-slate-100 rounded-lg animate-pulse" />}>
            <SearchInput placeholder="Search by customer or status…" />
          </Suspense>
          <Link
            href="/dashboard/quotes/new"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> New Quote
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              {ql ? 'No quotes match your search' : 'No quotes yet'}
            </p>
            <p className="text-sm text-slate-400 mb-4">
              {ql ? 'Try a different search term.' : 'Create a quote to start the sales process'}
            </p>
            {!ql && (
              <Link
                href="/dashboard/quotes/new"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> New Quote
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiry</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Subtotal</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((quote) => {
                const customer = (
                  Array.isArray(quote.customers) ? quote.customers[0] : quote.customers
                ) as { name: string; business_name: string | null } | null
                const cfg = STATUS_CONFIG[quote.status] ?? { label: quote.status, className: 'bg-slate-100 text-slate-600' }
                return (
                  <tr key={quote.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{customer?.name ?? '—'}</span>
                        {quote.is_reorder && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                            Reorder
                          </span>
                        )}
                      </div>
                      {customer?.business_name && (
                        <span className="block text-xs text-slate-400">{customer.business_name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <ExpiryBadge expiresAt={quote.expires_at ?? null} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                      ${Number(quote.subtotal).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {new Date(quote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/dashboard/quotes/${quote.id}`}
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
