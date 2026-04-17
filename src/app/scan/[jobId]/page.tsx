import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JOB_STAGE_SEQUENCE, type JobStage } from '@/lib/types'
import { ScanClient } from './ScanClient'

export default async function ScanPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/scan/${jobId}`)

  const { data: job } = await supabase
    .from('jobs')
    .select('id, stage, orders(id, customers(name))')
    .eq('id', jobId)
    .single()

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6">
        <p className="text-xl font-semibold text-red-400">Job not found</p>
        <p className="text-sm text-gray-500 mt-2">This QR code may be outdated or invalid.</p>
      </div>
    )
  }

  const order = Array.isArray(job.orders) ? job.orders[0] : job.orders
  const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers
  const customerName = customer?.name ?? 'Unknown Customer'

  const currentStage = job.stage as JobStage
  const currentIdx = JOB_STAGE_SEQUENCE.indexOf(currentStage)
  const nextStage =
    currentIdx >= 0 && currentIdx < JOB_STAGE_SEQUENCE.length - 1
      ? (JOB_STAGE_SEQUENCE[currentIdx + 1] as JobStage)
      : null

  return (
    <ScanClient
      jobId={jobId}
      customerName={customerName}
      initialStage={currentStage}
      initialNextStage={nextStage}
    />
  )
}
