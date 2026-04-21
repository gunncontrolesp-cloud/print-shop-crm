'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { CheckCircle2, X } from 'lucide-react'

const MESSAGES: Record<string, string> = {
  payment_link_sent: 'Payment link sent to customer.',
  reminder_sent: 'Reminder email sent to customer.',
  invoice_sent: 'Invoice marked as sent.',
}

export function FlashMessage({ message }: { message?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message || !MESSAGES[message]) return
    setVisible(true)
    router.replace(pathname, { scroll: false })
    const t = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(t)
  }, [message, pathname, router])

  if (!visible || !message || !MESSAGES[message]) return null

  return (
    <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 animate-fade-up">
      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
      <p className="flex-1 font-medium">{MESSAGES[message]}</p>
      <button
        onClick={() => setVisible(false)}
        className="text-emerald-400 hover:text-emerald-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
