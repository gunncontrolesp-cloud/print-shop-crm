import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button-variants'
import { deleteCustomer } from '@/lib/actions/customers'

export default async function CustomerDetailPage({
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

  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  const deleteAction = deleteCustomer.bind(null, id)

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/customers" className="text-sm text-gray-500 hover:text-gray-900">
          ← Customers
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
          {customer.business_name && (
            <p className="text-gray-500 mt-1">{customer.business_name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/customers/${id}/edit`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Edit
          </Link>
          {isAdmin && (
            <form action={deleteAction}>
              <button
                type="submit"
                className={buttonVariants({ variant: 'destructive' })}
                onClick={(e) => {
                  if (!confirm('Delete this customer? This cannot be undone.')) {
                    e.preventDefault()
                  }
                }}
              >
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
        {[
          { label: 'Email', value: customer.email },
          { label: 'Phone', value: customer.phone },
          { label: 'Address', value: customer.address },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</dt>
            <dd className="text-sm text-gray-900">{value || '—'}</dd>
          </div>
        ))}

        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Created</dt>
          <dd className="text-sm text-gray-900">
            {new Date(customer.created_at).toLocaleDateString('en-US')}
          </dd>
        </div>
      </dl>

      {customer.notes && (
        <div className="mt-4 max-w-2xl bg-white rounded-lg border border-gray-200 px-4 py-3">
          <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</dt>
          <dd className="text-sm text-gray-900 whitespace-pre-wrap">{customer.notes}</dd>
        </div>
      )}

      {customer.preferences && Object.keys(customer.preferences).length > 0 && (
        <div className="mt-4 max-w-2xl bg-white rounded-lg border border-gray-200 px-4 py-3">
          <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Preferences</dt>
          <pre className="text-sm text-gray-900 overflow-auto">
            {JSON.stringify(customer.preferences, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
