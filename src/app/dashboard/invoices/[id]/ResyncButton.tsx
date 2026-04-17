'use client'

import { useState, useTransition } from 'react'
import { resyncInvoice } from '@/lib/actions/invoices'

export function ResyncButton({ invoiceId }: { invoiceId: string }) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleResync() {
    setResult(null)
    startTransition(async () => {
      const res = await resyncInvoice(invoiceId)
      setResult(res)
    })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={handleResync}
        disabled={isPending}
        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Syncing…' : 'Resync to Accounting'}
      </button>
      {result && (
        <span className={`text-xs font-medium ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
          {result.ok ? '✓' : '✗'} {result.message}
        </span>
      )}
    </div>
  )
}
