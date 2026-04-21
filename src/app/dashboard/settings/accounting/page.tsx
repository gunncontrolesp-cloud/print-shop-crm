import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { saveAccountingSettings } from '@/lib/actions/accounting'
import { TestConnectionButton } from './TestConnectionButton'

export default async function AccountingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error: errorMsg, success } = await searchParams

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
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('accounting_webhook_url, accounting_webhook_enabled')
    .single()

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="p-4 sm:p-8 max-w-xl">
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Accounting settings saved.
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Accounting Integration</h1>
        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
          Admin only
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Connect to QuickBooks or Xero via n8n. The CRM fires a webhook when invoices are
        created or paid — your n8n workflow handles the QB/Xero API calls.
      </p>

      <form action={saveAccountingSettings} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">n8n Webhook URL</label>
          <input
            name="accounting_webhook_url"
            type="url"
            defaultValue={tenant?.accounting_webhook_url ?? ''}
            placeholder="https://your-n8n-instance.com/webhook/accounting"
            className={inputClass}
          />
          <p className="text-xs text-gray-400">
            Create a webhook trigger node in n8n and paste its URL here.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="accounting_webhook_enabled"
            name="accounting_webhook_enabled"
            type="checkbox"
            defaultChecked={tenant?.accounting_webhook_enabled ?? false}
            className="h-4 w-4 rounded border-gray-300 accent-gray-900"
          />
          <label htmlFor="accounting_webhook_enabled" className="text-sm text-gray-700 cursor-pointer">
            Enable accounting sync
          </label>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-3">Test Connection</p>
        <TestConnectionButton />
        <p className="text-xs text-gray-400 mt-2">
          Sends a <code className="font-mono">test.connection</code> event to verify the URL is reachable.
        </p>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-2">Events fired</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>
            <code className="font-mono text-gray-700">invoice.created</code> — when an invoice is
            generated from an order
          </li>
          <li>
            <code className="font-mono text-gray-700">invoice.paid</code> — when Stripe confirms
            payment
          </li>
        </ul>
        <p className="text-xs text-gray-400 mt-2">
          Each event includes <code className="font-mono">invoiceId</code>,{' '}
          <code className="font-mono">orderId</code>, <code className="font-mono">amount</code>,
          and customer details.
        </p>
      </div>
    </div>
  )
}
