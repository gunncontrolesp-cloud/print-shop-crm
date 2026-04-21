'use client'

import { useState, useEffect, useTransition } from 'react'
import { buttonVariants } from '@/components/ui/button-variants'

export function ConfirmDeleteButton({
  action,
  label = 'Delete',
}: {
  action: () => Promise<void>
  label?: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 5000)
    return () => clearTimeout(t)
  }, [confirming])

  if (confirming) {
    return (
      <div className="flex items-center gap-2 animate-fade-up">
        <span className="text-sm text-slate-500">Sure?</span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className={buttonVariants({ variant: 'outline' })}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => action())}
          className={buttonVariants({ variant: 'destructive' })}
        >
          {isPending ? 'Deleting…' : 'Confirm'}
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={buttonVariants({ variant: 'destructive' })}
    >
      {label}
    </button>
  )
}
