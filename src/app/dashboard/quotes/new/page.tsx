import { createClient } from '@/lib/supabase/server'
import { createQuote } from '@/lib/actions/quotes'
import type { Product } from '@/lib/types'
import { QuoteBuilder } from '@/components/quote-builder'

export default async function NewQuotePage() {
  const supabase = await createClient()

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, business_name')
      .order('name', { ascending: true }),
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true }),
  ])

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-foreground mb-6">New Quote</h1>
      <QuoteBuilder
        customers={customers ?? []}
        products={(products ?? []) as Product[]}
        createQuote={createQuote}
      />
    </div>
  )
}
