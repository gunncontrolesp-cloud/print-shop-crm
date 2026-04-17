'use client'

import { useState, useTransition } from 'react'
import { testAccountingWebhook } from '@/lib/actions/accounting'

export function TestConnectionButton() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleTest() {
    setResult(null)
    startTransition(async () => {
      const res = await testAccountingWebhook()
      setResult(res)
    })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={handleTest}
        disabled={isPending}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Testing…' : 'Test Connection'}
      </button>
      {result && (
        <span
          className={`text-sm font-medium ${result.ok ? 'text-green-600' : 'text-red-600'}`}
        >
          {result.ok ? '✓' : '✗'} {result.message}
        </span>
      )}
    </div>
  )
}
