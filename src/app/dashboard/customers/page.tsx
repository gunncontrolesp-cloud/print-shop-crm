import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Users, Plus, Mail, Phone, Building2, ArrowRight } from 'lucide-react'

export default async function CustomersPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, business_name, email, phone')
    .order('name', { ascending: true })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{customers?.length ?? 0} total</p>
        </div>
        <Link
          href="/dashboard/customers/new"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> New Customer
        </Link>
      </div>

      {!customers || customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No customers yet</p>
            <p className="text-sm text-slate-400 mb-4">Add your first customer to get started</p>
            <Link
              href="/dashboard/customers/new"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Customer
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Business</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {customer.business_name ? (
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {customer.business_name}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {customer.email ? (
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {customer.email}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {customer.phone ? (
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {customer.phone}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View <ArrowRight className="h-3 w-3" />
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
