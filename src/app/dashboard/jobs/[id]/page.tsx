import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateQrDataUrl } from '@/lib/qr'
import Image from 'next/image'
import { PrintButton } from './PrintButton'

export default async function JobDetailPage({
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

  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: job } = await supabase
    .from('jobs')
    .select('id, stage, created_at, order_id, orders(total, customers(name))')
    .eq('id', id)
    .single()

  if (!job) redirect('/dashboard/production')

  const order = Array.isArray(job.orders) ? job.orders[0] : job.orders
  const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const scanUrl = `${appUrl}/scan/${job.id}`
  const qrDataUrl = await generateQrDataUrl(scanUrl)

  const STAGE_LABELS: Record<string, string> = {
    design: 'Design',
    proofing: 'Proofing',
    printing: 'Printing',
    finishing: 'Finishing',
    ready_for_pickup: 'Ready for Pickup',
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <a href="/dashboard/production" className="text-sm text-indigo-600 hover:underline">
          ← Back to Production Board
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">
            {customer?.name ?? 'Unknown Customer'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Order #{job.order_id.slice(0, 8).toUpperCase()} ·{' '}
            Stage:{' '}
            <span className="font-medium text-gray-700">
              {STAGE_LABELS[job.stage] ?? job.stage}
            </span>
          </p>
        </div>

        <div className="px-8 py-8 flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500 text-center">
            Scan to advance this job on the shop floor
          </p>
          <div className="border-2 border-gray-200 rounded-xl p-4 bg-white">
            <Image
              src={qrDataUrl}
              alt={`QR code for job ${job.id}`}
              width={200}
              height={200}
              unoptimized
            />
          </div>
          <p className="text-xs text-gray-400 font-mono break-all text-center max-w-xs">
            {scanUrl}
          </p>
        </div>

        <div className="px-8 pb-8 flex justify-center">
          <PrintButton />
        </div>
      </div>
    </div>
  )
}
