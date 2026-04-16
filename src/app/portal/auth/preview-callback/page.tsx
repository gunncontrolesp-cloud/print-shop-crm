'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PortalPreviewCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    async function handleSession() {
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.slice(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const supabase = createClient()
          await supabase.auth.setSession({ access_token, refresh_token })
        }
      }
      router.replace('/portal')
    }
    handleSession()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Signing in...</p>
    </main>
  )
}
