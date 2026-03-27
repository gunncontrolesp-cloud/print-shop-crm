import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateCustomer } from '@/lib/actions/customers'
import { CustomerForm } from '@/components/customer-form'

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) notFound()

  const action = updateCustomer.bind(null, id)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Edit Customer</h1>
      <p className="text-gray-500 text-sm mb-6">{customer.name}</p>
      <CustomerForm
        customer={customer}
        action={action}
        cancelHref={`/dashboard/customers/${id}`}
      />
    </div>
  )
}
