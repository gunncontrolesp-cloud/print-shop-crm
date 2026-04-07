import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { type InvoiceStatus } from '@/lib/types'

export default async function PortalInvoicesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/portal/login')

  const serviceClient = createServiceClient()
  const { data: customer } = await serviceClient
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!customer) redirect('/portal')

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, amount, status, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Your Invoices</h1>

      {!invoices?.length ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No invoices yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Invoice</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Date</th>
                <th className="sr-only">Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    #{invoice.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    ${Number(invoice.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {new Date(invoice.created_at).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {invoice.status === 'sent' ? (
                      <Link
                        href={`/portal/invoices/${invoice.id}/pay`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Pay Now →
                      </Link>
                    ) : invoice.status === 'paid' ? (
                      <span className="text-xs text-green-600 font-medium">Paid</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded capitalize font-medium ${INVOICE_STATUS_COLORS[status]}`}
    >
      {status}
    </span>
  )
}
