import { createCustomer } from '@/lib/actions/customers'
import { CustomerForm } from '@/components/customer-form'

export default function NewCustomerPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">New Customer</h1>
      <CustomerForm action={createCustomer} cancelHref="/dashboard/customers" />
    </div>
  )
}
