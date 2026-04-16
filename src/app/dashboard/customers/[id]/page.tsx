import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button-variants'
import { deleteCustomer } from '@/lib/actions/customers'
import { addCommEntry, deleteCommEntry } from '@/lib/actions/comm-log'
import { DeleteCustomerButton } from './delete-button'

const TYPE_BADGE: Record<string, { label: string; classes: string }> = {
  note:  { label: 'Note',  classes: 'bg-gray-100 text-gray-600' },
  call:  { label: 'Call',  classes: 'bg-blue-100 text-blue-700' },
  email: { label: 'Email', classes: 'bg-green-100 text-green-700' },
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ comm_error?: string }>
}) {
  const { id } = await params
  const { comm_error } = await searchParams
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

  const { data: commLog } = await supabase
    .from('customer_comm_log')
    .select('id, type, body, created_at, users(name)')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  const deleteAction = deleteCustomer.bind(null, id)

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'

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
          {isAdmin && customer.email && (
            <a
              href={`/api/preview-portal?customer_id=${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline' })}
            >
              Preview Portal
            </a>
          )}
          <Link
            href={`/dashboard/customers/${id}/edit`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Edit
          </Link>
          {isAdmin && (
            <DeleteCustomerButton action={deleteAction} />
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

      {/* Communication Log */}
      <div className="mt-8 max-w-2xl">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Communication Log
        </h2>

        {comm_error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(comm_error)}
          </div>
        )}

        <form action={addCommEntry} className="mb-4 bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <input type="hidden" name="customer_id" value={id} />
          <div className="flex gap-3 items-start">
            <select
              name="type"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
            </select>
            <textarea
              name="body"
              required
              rows={2}
              placeholder="Add a note, call summary, or email..."
              className={`flex-1 ${inputClass}`}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Log Entry
            </button>
          </div>
        </form>

        {!commLog || commLog.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No entries yet.</p>
        ) : (
          <div className="space-y-2">
            {commLog.map((entry) => {
              const badge = TYPE_BADGE[entry.type] ?? TYPE_BADGE.note
              const author = Array.isArray(entry.users) ? entry.users[0] : entry.users
              const deleteEntryAction = isAdmin
                ? deleteCommEntry.bind(null, entry.id)
                : null

              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${badge.classes}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(author as { name: string } | null)?.name ?? 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {isAdmin && deleteEntryAction && (
                      <form action={deleteEntryAction}>
                        <button
                          type="submit"
                          className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.body}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
