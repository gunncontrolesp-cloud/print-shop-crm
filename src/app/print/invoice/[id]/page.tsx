import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { LineItem } from '@/lib/types'
import { PrintButton } from './PrintButton'

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, orders(id, total, line_items, customers(name, business_name, email))')
    .eq('id', id)
    .single()

  if (!invoice) notFound()

  const { data: tenant } = await supabase.from('tenants').select('*').single()

  const order = Array.isArray(invoice.orders) ? invoice.orders[0] : invoice.orders
  const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers
  const lineItems = (order?.line_items ?? []) as LineItem[]

  const shopName = tenant?.shop_name ?? tenant?.name ?? 'Print Shop'
  const invoiceNumber = id.slice(0, 8).toUpperCase()
  const invoiceDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link
          href={`/dashboard/invoices/${id}`}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Back to invoice
        </Link>
        <PrintButton />
      </div>

      {/* Invoice document */}
      <div className="bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-12 py-12 print:px-8 print:py-8">

          {/* Header: shop info + invoice meta */}
          <div className="flex items-start justify-between mb-10">
            <div>
              {tenant?.logo_url && (
                <img
                  src={tenant.logo_url}
                  alt={shopName}
                  className="h-14 object-contain mb-3"
                />
              )}
              <p className="text-lg font-bold text-gray-900">{shopName}</p>
              {tenant?.shop_address && (
                <p className="text-sm text-gray-500 whitespace-pre-line mt-0.5">
                  {tenant.shop_address}
                </p>
              )}
              {(tenant?.shop_phone || tenant?.shop_email) && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {[tenant?.shop_phone, tenant?.shop_email].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h1>
              <p className="text-sm text-gray-500 mt-1">#{invoiceNumber}</p>
              <div className="mt-4 space-y-1 text-sm text-gray-600">
                <p>
                  <span className="text-gray-400">Date:&nbsp;</span>
                  {invoiceDate}
                </p>
                {dueDate && (
                  <p>
                    <span className="text-gray-400">Due:&nbsp;</span>
                    {dueDate}
                  </p>
                )}
                <p>
                  <span className="text-gray-400">Status:&nbsp;</span>
                  <span className="capitalize font-medium text-gray-800">{invoice.status}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200 mb-8" />

          {/* Bill to */}
          <div className="mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Bill To
            </p>
            <p className="font-semibold text-gray-900">{customer?.name ?? 'Customer'}</p>
            {customer?.business_name && (
              <p className="text-sm text-gray-600">{customer.business_name}</p>
            )}
            {customer?.email && (
              <p className="text-sm text-gray-500">{customer.email}</p>
            )}
          </div>

          {/* Line items */}
          {lineItems.length > 0 ? (
            <table className="w-full mb-8 text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-1/2">
                    Description
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Unit Price
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={item.id ?? i} className="border-b border-gray-100">
                    <td className="py-3 text-gray-800">{item.description}</td>
                    <td className="py-3 text-right text-gray-600">{item.qty.toLocaleString()}</td>
                    <td className="py-3 text-right text-gray-600">
                      ${Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-gray-800 font-medium">
                      ${Number(item.line_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="border border-gray-100 rounded-lg px-4 py-6 text-sm text-gray-400 text-center mb-8">
              No line items
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end mb-10">
            <div className="w-56 space-y-2">
              {lineItems.length > 0 && Number(invoice.amount) !== Number(order?.total) && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>${Number(order?.total ?? invoice.amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 border-t-2 border-gray-900 pt-2 text-base">
                <span>Total</span>
                <span>${Number(invoice.amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment terms / notes */}
          {tenant?.payment_terms && (
            <div className="border-t border-gray-100 pt-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                Payment Terms
              </p>
              <p className="text-sm text-gray-600">{tenant.payment_terms}</p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
