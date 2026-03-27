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

export default async function CustomersPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, business_name, email, phone')
    .order('name', { ascending: true })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
        <Link href="/dashboard/customers/new" className={buttonVariants()}>
          New Customer
        </Link>
      </div>

      {!customers || customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base">No customers yet.</p>
          <p className="text-sm mt-1">
            <Link href="/dashboard/customers/new" className="text-blue-600 hover:underline">
              Add your first customer
            </Link>
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-gray-500">{customer.business_name ?? '—'}</TableCell>
                  <TableCell className="text-gray-500">{customer.email ?? '—'}</TableCell>
                  <TableCell className="text-gray-500">{customer.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
