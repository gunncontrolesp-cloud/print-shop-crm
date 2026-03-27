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
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  printing: 'bg-yellow-100 text-yellow-700',
  finishing: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  delivered: 'bg-teal-100 text-teal-700',
}

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total, created_at, customers(name, business_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base">No orders yet.</p>
          <p className="text-sm mt-1">
            Orders are created by converting an{' '}
            <Link href="/dashboard/quotes" className="text-blue-600 hover:underline">
              approved quote
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const customer = (
                  Array.isArray(order.customers) ? order.customers[0] : order.customers
                ) as { name: string; business_name: string | null } | null
                return (
                  <TableRow key={order.id} className="hover:bg-gray-50">
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
                        className={`inline-block text-xs px-2 py-0.5 rounded capitalize font-medium ${statusStyles[order.status] ?? ''}`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(order.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(order.created_at).toLocaleDateString('en-US')}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
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
