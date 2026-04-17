'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?recovery=1`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email and we&apos;ll send a reset link.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700">
              Check your email for a password reset link.
            </div>
            <Link href="/login" className="block text-center text-sm text-gray-500 hover:text-gray-900">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <Link href="/login" className="block text-center text-sm text-gray-500 hover:text-gray-900">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
