import { createClient } from '@/lib/supabase/server'
import { ProductionBoard } from '@/components/production-board'

export default async function ProductionPage() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, orders(total, line_items, customers(name))')
    .is('completed_at', null)
    .order('created_at', { ascending: true })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Production Board</h1>
        <p className="text-sm text-gray-500 mt-1">Track jobs through each production stage</p>
      </div>
      <ProductionBoard initialJobs={jobs ?? []} />
    </div>
  )
}
