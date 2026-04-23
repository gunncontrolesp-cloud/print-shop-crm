'use client'

import { useState, useTransition } from 'react'
import { clockIn, clockOut } from '@/lib/actions/timeclock'

export function ClockButtons({ isClockedIn }: { isClockedIn: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClock() {
    setError(null)
    startTransition(async () => {
      const result = isClockedIn ? await clockOut() : await clockIn()
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleClock}
        disabled={isPending}
        className={`w-full py-4 text-lg font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 ${
          isClockedIn
            ? 'bg-rose-600 text-white hover:bg-rose-700'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        {isPending ? '…' : isClockedIn ? 'Clock Out' : 'Clock In'}
      </button>
    </div>
  )
}
