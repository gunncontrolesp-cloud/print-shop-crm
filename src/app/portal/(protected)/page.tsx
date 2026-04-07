import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/lib/types'

export default async function PortalHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/portal/login')

  const serviceClient = createServiceClient()

  // Find customer by auth_user_id
  let { data: customer } = await serviceClient
    .from('customers')
    .select('id, name, business_name, email, auth_user_id')
    .eq('auth_user_id', user.id)
    .single()

  // Auto-link on first visit: find by email match
  if (!customer) {
    const { data: unlinked } = await serviceClient
      .from('customers')
      .select('id, name, business_name')
      .eq('email', user.email!)
      .is('auth_user_id', null)
      .single()

    if (unlinked) {
      await serviceClient
        .from('customers')
        .update({ auth_user_id: user.id })
        .eq('id', unlinked.id)
      customer = { ...unlinked, email: user.email!, auth_user_id: user.id }
    }
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">
          Your account isn&apos;t linked yet. Contact us at{' '}
          <a href="mailto:hello@printshop.com" className="text-blue-600 hover:underline">
            hello@printshop.com
          </a>{' '}
          to get access.
        </p>
      </div>
    )
  }

  // Fetch orders — RLS filters to this customer's orders only
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Your Orders</h1>

      {!orders?.length ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No orders yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Order</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Total</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Date</th>
                <th className="sr-only">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status as OrderStatus} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    ${Number(order.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {new Date(order.created_at).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/portal/orders/${order.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View →
                    </Link>
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

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  printing: 'bg-yellow-100 text-yellow-700',
  finishing: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  delivered: 'bg-teal-100 text-teal-700',
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded capitalize font-medium ${STATUS_COLORS[status]}`}
    >
      {status}
    </span>
  )
}
