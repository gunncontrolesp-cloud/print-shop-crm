import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createPresignedDownloadUrl } from '@/lib/actions/files'
import { approveProof, requestProofChanges } from '@/lib/actions/proof'
import { ORDER_STATUS_SEQUENCE, type OrderStatus } from '@/lib/types'

export default async function PortalOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/portal/login')

  // Verify customer is linked
  const serviceClient = createServiceClient()
  const { data: customer } = await serviceClient
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!customer) redirect('/portal')

  // Fetch order — RLS ensures it belongs to this customer
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, total, created_at')
    .eq('id', id)
    .single()

  if (!order) notFound()

  // Fetch job (may not exist if order hasn't entered production)
  const { data: job } = await supabase
    .from('jobs')
    .select('id, stage, proof_decision, proof_comments')
    .eq('order_id', id)
    .is('completed_at', null)
    .maybeSingle()

  // Fetch files
  const { data: files } = await supabase
    .from('files')
    .select('id, name, content_type, size_bytes, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  // Generate presigned download URLs
  const fileDownloads = await Promise.all(
    (files ?? []).map(async (file) => {
      try {
        const url = await createPresignedDownloadUrl(file.id)
        return { ...file, downloadUrl: url }
      } catch {
        return { ...file, downloadUrl: null }
      }
    })
  )

  const currentStatus = order.status as OrderStatus
  const currentIdx = ORDER_STATUS_SEQUENCE.indexOf(currentStatus)

  const approveProofAction = job ? approveProof.bind(null, job.id) : null
  const requestChangesAction = job ? requestProofChanges.bind(null, job.id) : null

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/portal" className="text-sm text-gray-500 hover:text-gray-900">
          ← Orders
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        Order #{id.slice(0, 8).toUpperCase()}
      </h1>
      <p className="text-sm text-gray-400 mb-8">
        Placed {new Date(order.created_at).toLocaleDateString('en-US')} · $
        {Number(order.total).toFixed(2)}
      </p>

      {/* Status timeline */}
      <div className="mb-8">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Status</p>
        <div className="flex items-center">
          {ORDER_STATUS_SEQUENCE.map((stage, idx) => {
            const isCompleted = idx < currentIdx
            const isCurrent = idx === currentIdx
            return (
              <div key={stage} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      isCompleted
                        ? 'bg-gray-900 border-gray-900'
                        : isCurrent
                        ? 'bg-white border-gray-900'
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  <span
                    className={`text-xs capitalize whitespace-nowrap ${
                      isCurrent ? 'font-semibold text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {stage}
                  </span>
                </div>
                {idx < ORDER_STATUS_SEQUENCE.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mb-4 ${
                      idx < currentIdx ? 'bg-gray-900' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Production stage + proof approval */}
      {job && (
        <div className="mb-8">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Production Stage
          </p>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <span className="text-sm font-medium text-gray-800 capitalize">
              {job.stage.replace(/_/g, ' ')}
            </span>

            {job.stage === 'proofing' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {job.proof_decision === 'approved' && (
                  <p className="text-sm text-green-700 font-medium">✓ You approved this proof</p>
                )}
                {job.proof_decision === 'changes_requested' && (
                  <div>
                    <p className="text-sm text-orange-700 font-medium mb-1">Changes requested</p>
                    <p className="text-sm text-gray-600">{job.proof_comments}</p>
                  </div>
                )}
                {!job.proof_decision && approveProofAction && requestChangesAction && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Please review the proof files below and let us know your decision.
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <form action={approveProofAction}>
                        <button
                          type="submit"
                          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                        >
                          Approve Proof
                        </button>
                      </form>
                    </div>
                    <form action={requestChangesAction} className="space-y-2">
                      <textarea
                        name="comments"
                        required
                        placeholder="Describe the changes needed..."
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Request Changes
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Files */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Files</p>
        {fileDownloads.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center">
            <p className="text-sm text-gray-400">No files attached yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {fileDownloads.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(file.size_bytes)} ·{' '}
                    {new Date(file.created_at).toLocaleDateString('en-US')}
                  </p>
                </div>
                {file.downloadUrl ? (
                  <a
                    href={file.downloadUrl}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Unavailable</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
