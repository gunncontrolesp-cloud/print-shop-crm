'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button-variants'

export default function DateRangeForm({
  from,
  to,
}: {
  from?: string
  to?: string
}) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const defaultFrom = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [fromVal, setFromVal] = useState(from ?? defaultFrom)
  const [toVal, setToVal] = useState(to ?? today)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/dashboard/timeclock/reports?from=${fromVal}&to=${toVal}`)
  }

  function setPreset(days: number) {
    const f = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setFromVal(f)
    setToVal(today)
    router.push(`/dashboard/timeclock/reports?from=${f}&to=${today}`)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-4 mb-8">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={fromVal}
            max={toVal}
            onChange={(e) => setFromVal(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={toVal}
            min={fromVal}
            max={today}
            onChange={(e) => setToVal(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <button type="submit" className={buttonVariants({ size: 'sm' as 'default' })}>
          Apply
        </button>
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={() => setPreset(7)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            7 days
          </button>
          <button type="button" onClick={() => setPreset(14)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            14 days
          </button>
          <button type="button" onClick={() => setPreset(28)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            28 days
          </button>
        </div>
      </form>
    </div>
  )
}
