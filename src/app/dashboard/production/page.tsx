import { createClient } from '@/lib/supabase/server'
import { ProductionBoard } from '@/components/production-board'

export default async function ProductionPage() {
  const supabase = await createClient()

  const [{ data: jobs }, { data: { user } }] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, orders(total, line_items, customers(name))')
      .is('completed_at', null)
      .order('created_at', { ascending: true }),
    supabase.auth.getUser(),
  ])

  let isElevated = false
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    isElevated = ['admin', 'manager'].includes(profile?.role ?? '')
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Production Board</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track jobs through each production stage</p>
      </div>
      <ProductionBoard initialJobs={jobs ?? []} isElevated={isElevated} />
    </div>
  )
}
