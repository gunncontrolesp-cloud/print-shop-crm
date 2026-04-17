'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

const BUCKET = 'order-files'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/tiff',
  'application/postscript',
  'application/illustrator',
]

export async function createPresignedUploadUrl(
  orderId: string,
  filename: string,
  contentType: string,
  sizeBytes: number
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error('File type not allowed')
  }

  if (sizeBytes > 100 * 1024 * 1024) {
    throw new Error('File too large (max 100 MB)')
  }

  const { randomUUID } = await import('crypto')
  const storagePath = `${orderId}/${randomUUID()}-${filename}`

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath)

  if (error || !data) throw new Error('Failed to create upload URL')

  return { presignedUrl: data.signedUrl, s3Key: storagePath }
}

export async function recordUploadedFile(
  orderId: string,
  name: string,
  s3Key: string,
  contentType: string,
  sizeBytes: number
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from('files')
    .insert({
      tenant_id: tenantId,
      order_id: orderId,
      name,
      s3_key: s3Key,
      content_type: contentType,
      size_bytes: sizeBytes,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/orders/${orderId}`)

  return data
}

export async function createPresignedDownloadUrl(fileId: string): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: file, error } = await supabase
    .from('files')
    .select('s3_key, name')
    .eq('id', fileId)
    .single()

  if (error || !file) throw new Error('File not found')

  const serviceClient = createServiceClient()
  const { data, error: signError } = await serviceClient.storage
    .from(BUCKET)
    .createSignedUrl(file.s3_key, 3600, { download: file.name })

  if (signError || !data) throw new Error('Failed to create download URL')

  return data.signedUrl
}

export async function toggleCustomerAsset(fileId: string, isAsset: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) throw new Error('Manager access required')

  const { error } = await supabase
    .from('files')
    .update({ is_customer_asset: isAsset })
    .eq('id', fileId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/customers')
}

export async function deleteFile(fileId: string) {
  const supabase = await createClient()

  const { data: file, error: fetchError } = await supabase
    .from('files')
    .select('s3_key, order_id')
    .eq('id', fileId)
    .single()

  if (fetchError || !file) throw new Error('File not found')

  const serviceClient = createServiceClient()
  const { error: storageError } = await serviceClient.storage
    .from(BUCKET)
    .remove([file.s3_key])

  if (storageError) throw new Error(storageError.message)

  const { error: deleteError } = await supabase.from('files').delete().eq('id', fileId)
  if (deleteError) throw new Error(deleteError.message)

  revalidatePath(`/dashboard/orders/${file.order_id}`)
}
