import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updatePricingConfig } from '@/lib/actions/pricing'

export default async function PricingSettingsPage() {
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

  const { data: pricingRow } = await supabase
    .from('pricing_config')
    .select('id, config')
    .single()

  const configJson = JSON.stringify(pricingRow?.config ?? {}, null, 2)

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Pricing Configuration</h1>
        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
          Admin only
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Edit the pricing config JSON below. Changes apply to all new quotes immediately after saving.
      </p>

      <form action={updatePricingConfig}>
        <input type="hidden" name="id" value={pricingRow?.id ?? ''} />
        <textarea
          name="config"
          defaultValue={configJson}
          rows={28}
          spellCheck={false}
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
        />
        <div className="mt-3 flex gap-3 items-center">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Save Changes
          </button>
          <span className="text-xs text-gray-400">
            Must be valid JSON — invalid JSON will throw an error.
          </span>
        </div>
      </form>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Pricing Formula</h2>
        <code className="block text-xs text-gray-600 leading-6">
          unit_price = base_price × qty_multiplier × material_multiplier × finishing_multiplier
          <br />
          line_total = unit_price × qty
        </code>
        <p className="mt-2 text-xs text-gray-500">
          <strong>qty_multiplier</strong> is selected from qty_breaks based on the ordered quantity.
          The break with the matching min/max range applies.
        </p>
      </div>
    </div>
  )
}
