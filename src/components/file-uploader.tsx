'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPresignedUploadUrl, recordUploadedFile, deleteFile } from '@/lib/actions/files'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/tiff',
  'application/postscript',
  'application/illustrator',
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type FileRow = {
  id: string
  name: string
  size_bytes: number
  created_at: string
}

export function OrderFilesPanel({
  orderId,
  files,
  isAdmin,
}: {
  orderId: string
  files: FileRow[]
  isAdmin: boolean
}) {
  const router = useRouter()

  return (
    <FileUploader
      orderId={orderId}
      files={files}
      isAdmin={isAdmin}
      onUploaded={() => router.refresh()}
    />
  )
}

function FileUploader({
  orderId,
  files,
  isAdmin,
  onUploaded,
}: {
  orderId: string
  files: FileRow[]
  isAdmin: boolean
  onUploaded: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('File type not allowed. Accepted: PDF, PNG, JPG, GIF, TIFF, AI, EPS')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const { presignedUrl, s3Key } = await createPresignedUploadUrl(
        orderId,
        file.name,
        file.type,
        file.size
      )

      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      if (!uploadRes.ok) throw new Error('Upload failed')

      await recordUploadedFile(orderId, file.name, s3Key, file.type, file.size)
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(fileId: string) {
    setDeleting(fileId)
    try {
      await deleteFile(fileId)
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      {/* Upload control */}
      <div className="flex items-center gap-3 mb-4">
        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-md cursor-pointer hover:bg-gray-700 transition-colors">
          {uploading ? 'Uploading…' : 'Upload File'}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.tiff,.ai,.eps"
            className="sr-only"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
        <span className="text-xs text-gray-400">PDF, PNG, JPG, GIF, TIFF, AI, EPS · max 100 MB</span>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {/* Files list */}
      {files.length === 0 ? (
        <p className="text-sm text-gray-400">No files uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between px-4 py-2.5 bg-white text-sm">
              <div>
                <span className="font-medium text-gray-900">{f.name}</span>
                <span className="ml-2 text-gray-400 text-xs">
                  {formatFileSize(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString('en-US')}
                </span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  disabled={deleting === f.id}
                  onClick={() => handleDelete(f.id)}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 ml-4"
                >
                  {deleting === f.id ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
