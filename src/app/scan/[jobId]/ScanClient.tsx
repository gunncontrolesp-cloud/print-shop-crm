'use client'

import { useState, useTransition } from 'react'
import { updateJobStage } from '@/lib/actions/jobs'
import { JOB_STAGE_SEQUENCE, type JobStage } from '@/lib/types'

const STAGE_LABELS: Record<JobStage, string> = {
  design: 'Design',
  proofing: 'Proofing',
  printing: 'Printing',
  finishing: 'Finishing',
  ready_for_pickup: 'Ready for Pickup',
}

export function ScanClient({
  jobId,
  customerName,
  initialStage,
  initialNextStage,
}: {
  jobId: string
  customerName: string
  initialStage: JobStage
  initialNextStage: JobStage | null
}) {
  const [currentStage, setCurrentStage] = useState(initialStage)
  const [nextStage, setNextStage] = useState(initialNextStage)
  const [confirmed, setConfirmed] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdvance() {
    if (!nextStage) return
    const target = nextStage
    setError(null)
    startTransition(async () => {
      const result = await updateJobStage(jobId, target)
      if (result?.error) {
        setError(result.error)
        return
      }
      const nextIdx = JOB_STAGE_SEQUENCE.indexOf(target) + 1
      const newNext = nextIdx < JOB_STAGE_SEQUENCE.length
        ? JOB_STAGE_SEQUENCE[nextIdx] as JobStage
        : null
      setCurrentStage(target)
      setNextStage(newNext)
      setConfirmed(`Moved to ${STAGE_LABELS[target]}`)
      setTimeout(() => setConfirmed(null), 4000)
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6 py-12">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Job for</p>
      <h1 className="text-3xl font-bold text-white mb-8 text-center">{customerName}</h1>

      <div className="mb-8 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Current Stage</p>
        <span className="text-2xl font-semibold text-indigo-400">
          {STAGE_LABELS[currentStage]}
        </span>
      </div>

      {confirmed && (
        <div className="mb-6 w-full max-w-xs rounded-xl bg-green-900/50 border border-green-700 px-5 py-4 text-green-300 text-base font-medium text-center">
          ✓ {confirmed}
        </div>
      )}

      {error && (
        <div className="mb-6 w-full max-w-xs rounded-xl bg-red-900/50 border border-red-700 px-5 py-4 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {nextStage ? (
        <button
          onClick={handleAdvance}
          disabled={isPending}
          className="w-full max-w-xs rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xl font-bold py-6 transition-colors"
        >
          {isPending ? 'Updating…' : `Advance to ${STAGE_LABELS[nextStage]}`}
        </button>
      ) : (
        <div className="w-full max-w-xs rounded-2xl bg-green-900/40 border border-green-700 px-6 py-5 text-green-300 text-lg font-semibold text-center">
          ✓ Job is complete
        </div>
      )}
    </div>
  )
}
