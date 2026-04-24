'use client'

import { useState, useTransition } from 'react'
import { buttonVariants } from '@/components/ui/button-variants'

export function SetPasswordForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [matchError, setMatchError] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirm) {
      setMatchError(true)
      return
    }
    setMatchError(false)
    const formData = new FormData(e.currentTarget)
    startTransition(() => action(formData))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
          Your Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background"
          placeholder="First and last name"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background"
          placeholder="Min. 8 characters"
        />
      </div>

      <div>
        <label htmlFor="confirm_password" className="block text-sm font-medium text-foreground mb-1">
          Confirm Password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setMatchError(false) }}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-background ${
            matchError ? 'border-rose-400 focus:ring-rose-300' : 'border-border focus:ring-primary/40'
          }`}
          placeholder="Re-enter password"
        />
        {matchError && (
          <p className="mt-1 text-xs text-rose-600">Passwords do not match</p>
        )}
      </div>

      <button type="submit" disabled={isPending} className={`w-full ${buttonVariants()}`}>
        {isPending ? 'Activating…' : 'Activate Account'}
      </button>
    </form>
  )
}
