'use server'

import { revalidatePath } from 'next/cache'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/tiff',
  'application/postscript',
  'application/illustrator',
]

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

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
  const s3Key = `uploads/${orderId}/${randomUUID()}-${filename}`

  const client = getS3Client()
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: s3Key,
    ContentType: contentType,
  })

  const presignedUrl = await getSignedUrl(client, command, { expiresIn: 300 })

  return { presignedUrl, s3Key }
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

  const { data, error } = await supabase
    .from('files')
    .insert({
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

export async function deleteFile(fileId: string) {
  const supabase = await createClient()

  const { data: file, error: fetchError } = await supabase
    .from('files')
    .select('s3_key, order_id')
    .eq('id', fileId)
    .single()

  if (fetchError || !file) throw new Error('File not found')

  const client = getS3Client()
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: file.s3_key,
    })
  )

  const { error: deleteError } = await supabase.from('files').delete().eq('id', fileId)
  if (deleteError) throw new Error(deleteError.message)

  revalidatePath(`/dashboard/orders/${file.order_id}`)
}
