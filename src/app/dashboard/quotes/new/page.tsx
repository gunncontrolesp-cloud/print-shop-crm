import { createClient } from '@/lib/supabase/server'
import { createQuote } from '@/lib/actions/quotes'
import type { PricingConfig } from '@/lib/types'
import { QuoteBuilder } from '@/components/quote-builder'

export default async function NewQuotePage() {
  const supabase = await createClient()

  const [{ data: customers }, { data: pricingRow }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, business_name')
      .order('name', { ascending: true }),
    supabase.from('pricing_config').select('config').single(),
  ])

  const config = (pricingRow?.config ?? null) as PricingConfig | null

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">New Quote</h1>
      {!config ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Pricing configuration not found. Apply the database migrations and seed the{' '}
          <code className="font-mono">pricing_config</code> table before creating quotes.
          Go to{' '}
          <a href="/dashboard/settings/pricing" className="underline font-medium">
            Settings → Pricing
          </a>{' '}
          to verify.
        </div>
      ) : (
        <QuoteBuilder
          customers={customers ?? []}
          config={config}
          createQuote={createQuote}
        />
      )}
    </div>
  )
}
