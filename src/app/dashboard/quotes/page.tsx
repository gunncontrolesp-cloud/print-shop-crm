import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default async function QuotesPage() {
  const supabase = await createClient()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, subtotal, created_at, customers(name, business_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
        <Link href="/dashboard/quotes/new" className={buttonVariants()}>
          New Quote
        </Link>
      </div>

      {!quotes || quotes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base">No quotes yet.</p>
          <p className="text-sm mt-1">
            <Link href="/dashboard/quotes/new" className="text-blue-600 hover:underline">
              Create your first quote
            </Link>
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => {
                const customer = (Array.isArray(quote.customers) ? quote.customers[0] : quote.customers) as { name: string; business_name: string | null } | null
                return (
                  <TableRow key={quote.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {customer?.name ?? '—'}
                      {customer?.business_name && (
                        <span className="block text-xs text-gray-400">
                          {customer.business_name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded capitalize font-medium ${statusStyles[quote.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {quote.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(quote.subtotal).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(quote.created_at).toLocaleDateString('en-US')}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/quotes/${quote.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
