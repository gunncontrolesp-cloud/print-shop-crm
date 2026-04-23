'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PrinterIcon } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [signupSent, setSignupSent] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('access_token')) return

    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (!accessToken || !refreshToken) return

    const supabase = createClient()
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (error) {
        setError(error.message)
        return
      }
      if (type === 'invite') {
        router.replace('/auth/set-password')
      } else {
        router.replace('/dashboard')
      }
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSignupSent(true)
      }
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      const next = new URLSearchParams(window.location.search).get('next')
      router.push(next ?? '/dashboard')
    }

    setLoading(false)
  }

  async function handleGoogleSignIn() {
    setError(null)
    setOauthLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setOauthLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[340px]">

        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
            <PrinterIcon className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-lg font-heading font-bold text-foreground tracking-tight leading-none">
              PrintShop
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.14em] leading-tight mt-0.5">
              CRM
            </p>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight mb-1">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {mode === 'signin' ? 'Access your shop’s dashboard' : 'Set up your print shop CRM'}
        </p>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={oauthLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary active:scale-[0.98] transition-[background-color,transform] duration-150 mb-6 disabled:opacity-50"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Email form */}
        {signupSent ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Check your email for a confirmation link, then sign in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder={mode === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || oauthLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-[opacity,transform] duration-150 disabled:opacity-50"
            >
              {loading ? (mode === 'signup' ? 'Creating…' : 'Signing in…') : (mode === 'signup' ? 'Create account' : 'Sign in')}
            </button>
          </form>
        )}

        <div className="mt-5 flex flex-col items-center gap-2">
          {mode === 'signin' && (
            <Link
              href="/auth/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              Forgot password?
            </Link>
          )}
          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setSignupSent(false) }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

      </div>
    </main>
  )
}
