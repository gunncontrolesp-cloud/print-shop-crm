import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminEditEntryForm } from '@/lib/actions/timeclock'
import { buttonVariants } from '@/components/ui/button-variants'
import type { TimeEntry } from '@/lib/types'

function toDatetimeLocal(ts: string): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export default async function EditTimeEntryPage({
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

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard/timeclock')

  const { data: entry } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (!entry) notFound()

  const timeEntry = entry as TimeEntry

  const { data: entryUser } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', timeEntry.user_id)
    .single()

  const employeeName = entryUser?.name || entryUser?.email || timeEntry.user_id

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <a
          href="/dashboard/timeclock/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Admin
        </a>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit Time Entry</h1>
      <p className="text-sm text-gray-500 mb-8">Employee: {employeeName}</p>

      <form action={adminEditEntryForm} className="space-y-5">
        <input type="hidden" name="entryId" value={timeEntry.id} />

        <div>
          <label htmlFor="clockedInAt" className="block text-sm font-medium text-gray-700 mb-1">
            Clock In <span className="text-gray-400 font-normal">(UTC)</span>
          </label>
          <input
            id="clockedInAt"
            name="clockedInAt"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocal(timeEntry.clocked_in_at)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label htmlFor="clockedOutAt" className="block text-sm font-medium text-gray-700 mb-1">
            Clock Out <span className="text-gray-400 font-normal">(UTC — leave blank if still open)</span>
          </label>
          <input
            id="clockedOutAt"
            name="clockedOutAt"
            type="datetime-local"
            defaultValue={timeEntry.clocked_out_at ? toDatetimeLocal(timeEntry.clocked_out_at) : ''}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={timeEntry.notes ?? ''}
            placeholder="Optional notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className={`flex-1 ${buttonVariants()}`}>
            Save Changes
          </button>
          <a
            href="/dashboard/timeclock/admin"
            className={`flex-1 text-center ${buttonVariants({ variant: 'outline' as 'default' })}`}
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
