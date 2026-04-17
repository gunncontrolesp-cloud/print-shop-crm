import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createPresignedDownloadUrl } from '@/lib/actions/files'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function PortalAssetsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/portal/login')

  const serviceClient = createServiceClient()
  const { data: customer } = await serviceClient
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!customer) redirect('/portal')

  // Get all order IDs for this customer
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', customer.id)

  const orderIds = (orders ?? []).map((o: { id: string }) => o.id)

  type AssetFile = {
    id: string
    name: string
    content_type: string
    size_bytes: number
    created_at: string
    order_id: string
    downloadUrl: string | null
  }

  let assets: AssetFile[] = []
  if (orderIds.length > 0) {
    const { data: rawFiles } = await supabase
      .from('files')
      .select('id, name, content_type, size_bytes, created_at, order_id')
      .in('order_id', orderIds)
      .eq('is_customer_asset', true)
      .order('created_at', { ascending: false })

    assets = await Promise.all(
      (rawFiles ?? []).map(async (file) => {
        try {
          const url = await createPresignedDownloadUrl(file.id)
          return { ...file, downloadUrl: url }
        } catch {
          return { ...file, downloadUrl: null }
        }
      })
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Your Artwork</h1>
      <p className="text-sm text-gray-500 mb-8">
        Files your print shop has saved as reusable artwork for your account.
      </p>

      {assets.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-700 mb-1">No artwork files yet</p>
          <p className="text-sm text-gray-400">
            Your files will appear here once your job is complete and the shop marks your artwork.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {assets.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatBytes(file.size_bytes)} ·{' '}
                  {new Date(file.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {file.downloadUrl ? (
                <a
                  href={file.downloadUrl}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Download
                </a>
              ) : (
                <span className="text-sm text-gray-400">Unavailable</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
