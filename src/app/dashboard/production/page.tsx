import { createClient } from '@/lib/supabase/server'
import { ProductionBoard } from '@/components/production-board'

export default async function ProductionPage() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, orders(total, line_items, customers(name), invoices(status))')
    .is('completed_at', null)
    .order('created_at', { ascending: true })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Production Board</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track jobs through each production stage</p>
      </div>
      <ProductionBoard initialJobs={jobs ?? []} />
    </div>
  )
}
