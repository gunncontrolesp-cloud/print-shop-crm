'use client'

import { useState, useTransition } from 'react'
import { kioskPunch } from '@/lib/actions/kiosk'

type Props = {
  tenantId: string
  shopName: string
}

type ResultState =
  | { type: 'idle' }
  | { type: 'success'; action: 'clocked_in' | 'clocked_out'; name: string }
  | { type: 'error'; message: string }

export function KioskClient({ tenantId, shopName }: Props) {
  const [pin, setPin] = useState('')
  const [result, setResult] = useState<ResultState>({ type: 'idle' })
  const [isPending, startTransition] = useTransition()

  function handleDigit(digit: string) {
    if (isPending) return
    if (result.type !== 'idle') {
      setResult({ type: 'idle' })
      setPin(digit)
      return
    }
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    if (next.length === 4) {
      startTransition(async () => {
        const res = await kioskPunch(tenantId, next)
        if (res.success) {
          setResult({ type: 'success', action: res.action, name: res.name })
        } else {
          setResult({ type: 'error', message: res.error })
        }
        setPin('')
        // Auto-reset to idle after 3 seconds
        setTimeout(() => setResult({ type: 'idle' }), 3000)
      })
    }
  }

  function handleClear() {
    setPin('')
    setResult({ type: 'idle' })
  }

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 select-none">
      <p className="text-gray-400 text-sm mb-1 tracking-wide uppercase">{shopName}</p>
      <h1 className="text-white text-2xl font-semibold mb-10">Time Clock</h1>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              i < pin.length ? 'bg-white border-white' : 'bg-transparent border-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Feedback */}
      {result.type === 'success' && (
        <div className={`mb-6 px-6 py-3 rounded-xl text-sm font-semibold ${
          result.action === 'clocked_in'
            ? 'bg-green-800 text-green-100'
            : 'bg-blue-800 text-blue-100'
        }`}>
          {result.action === 'clocked_in'
            ? `Welcome, ${result.name}! Clocked in.`
            : `See you later, ${result.name}! Clocked out.`}
        </div>
      )}
      {result.type === 'error' && (
        <div className="mb-6 px-6 py-3 rounded-xl text-sm font-semibold bg-red-900 text-red-200">
          {result.message}
        </div>
      )}
      {result.type === 'idle' && <div className="mb-6 h-[48px]" />}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {digits.map((d, i) => {
          if (d === '') return <div key={i} />
          const isBackspace = d === '⌫'
          return (
            <button
              key={i}
              onClick={() => {
                if (isBackspace) {
                  if (result.type !== 'idle') { setResult({ type: 'idle' }); return }
                  setPin(p => p.slice(0, -1))
                } else {
                  handleDigit(d)
                }
              }}
              disabled={isPending}
              className={`h-16 rounded-2xl text-xl font-medium transition-colors disabled:opacity-50 ${
                isBackspace
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-600'
              }`}
            >
              {d}
            </button>
          )
        })}
      </div>

      {pin.length > 0 && result.type === 'idle' && (
        <button
          onClick={handleClear}
          className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Clear
        </button>
      )}

      {isPending && (
        <p className="mt-6 text-gray-500 text-sm animate-pulse">Checking PIN…</p>
      )}
    </div>
  )
}
