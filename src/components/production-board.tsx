'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateJobStage, completeJob } from '@/lib/actions/jobs'
import { resetProofDecision } from '@/lib/actions/proof'
import { JOB_STAGE_SEQUENCE, type JobStage } from '@/lib/types'

type Job = {
  id: string
  order_id: string
  stage: JobStage
  notes: string | null
  proof_decision: string | null
  proof_comments: string | null
  completed_at: string | null
  created_at: string
  orders: {
    total: number
    line_items: unknown[]
    customers: { name: string } | null
  } | null
}

const STAGES: { id: JobStage; label: string; dotClass: string }[] = [
  { id: 'design',           label: 'Design',          dotClass: 'bg-sky-400' },
  { id: 'proofing',         label: 'Proofing',        dotClass: 'bg-violet-400' },
  { id: 'printing',         label: 'Printing',        dotClass: 'bg-amber-400' },
  { id: 'finishing',        label: 'Finishing',       dotClass: 'bg-orange-400' },
  { id: 'ready_for_pickup', label: 'Ready for Pickup',dotClass: 'bg-emerald-400' },
]

const STAGE_BUTTON_CLASSES: Record<JobStage, string> = {
  design:           'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200',
  proofing:         'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200',
  printing:         'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200',
  finishing:        'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200',
  ready_for_pickup: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200',
}

export function ProductionBoard({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [actionError, setActionError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleMoveStage(jobId: string, stage: JobStage) {
    const snapshot = jobs
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, stage } : j)))
    startTransition(async () => {
      const result = await updateJobStage(jobId, stage)
      if (result?.error) {
        setJobs(snapshot)
        setActionError(result.error)
        setTimeout(() => setActionError(null), 5000)
      }
    })
  }

  function handleComplete(jobId: string) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, completed_at: new Date().toISOString() } : j
      )
    )
    startTransition(async () => {
      await completeJob(jobId)
    })
  }

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('jobs-board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setJobs((prev) =>
              prev.map((j) =>
                j.id === payload.new.id ? { ...j, ...payload.new } : j
              )
            )
          }
          if (payload.eventType === 'INSERT') {
            setJobs((prev) => [...prev, payload.new as Job])
          }
          if (payload.eventType === 'DELETE') {
            setJobs((prev) => prev.filter((j) => j.id !== payload.old.id))
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const activeJobs = jobs.filter((j) => !j.completed_at)

  return (
    <div>
      {actionError && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <span className="font-medium">Blocked:</span> {actionError}
        </div>
      )}
      <div className="grid grid-cols-5 gap-4 min-h-[500px]">
        {STAGES.map((stage) => {
          const stageJobs = activeJobs.filter((j) => j.stage === stage.id)
          const nextStage = JOB_STAGE_SEQUENCE[
            JOB_STAGE_SEQUENCE.indexOf(stage.id) + 1
          ] as JobStage | undefined

          return (
            <div key={stage.id} className="flex flex-col">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.dotClass}`} />
                  <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                  {stageJobs.length}
                </span>
              </div>

              {/* Job cards */}
              <div className="flex flex-col gap-2 flex-1">
                {stageJobs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No jobs</p>
                ) : (
                  stageJobs.map((job) => {
                    const customer = job.orders?.customers
                    const lineItemCount = Array.isArray(job.orders?.line_items)
                      ? job.orders!.line_items.length
                      : 0
                    return (
                      <div
                        key={job.id}
                        className="bg-card rounded-lg border border-border p-3"
                      >
                        <p className="text-sm font-medium text-foreground truncate">
                          {customer?.name ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          #{job.order_id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {lineItemCount} item{lineItemCount !== 1 ? 's' : ''} ·{' '}
                          {new Date(job.created_at).toLocaleDateString('en-US')}
                        </p>

                        {job.proof_decision === 'approved' && (
                          <p className="text-xs text-emerald-600 font-medium mt-1">✓ Proof approved</p>
                        )}
                        {job.proof_decision === 'changes_requested' && (
                          <div className="mt-1">
                            <p className="text-xs text-orange-600 font-medium">Changes requested</p>
                            {job.proof_comments && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {job.proof_comments}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-2 flex flex-col gap-1">
                          <a
                            href={`/dashboard/jobs/${job.id}`}
                            className="w-full text-xs px-2 py-1 rounded font-medium bg-muted text-muted-foreground hover:bg-muted/60 border border-border transition-colors text-center"
                          >
                            View / Print QR
                          </a>
                          {nextStage && (
                            <button
                              type="button"
                              onClick={() => handleMoveStage(job.id, nextStage)}
                              className={`w-full text-xs px-2 py-1 rounded font-medium transition-colors ${STAGE_BUTTON_CLASSES[nextStage]}`}
                            >
                              Move to {STAGES.find((s) => s.id === nextStage)?.label}
                            </button>
                          )}
                          {stage.id === 'proofing' &&
                            job.proof_decision === 'changes_requested' && (
                              <button
                                type="button"
                                onClick={() => resetProofDecision(job.id)}
                                className="w-full text-xs px-2 py-1 rounded font-medium bg-muted text-muted-foreground hover:bg-muted/60 border border-border transition-colors"
                              >
                                Reset Proof
                              </button>
                            )}
                          {stage.id === 'ready_for_pickup' && (
                            <button
                              type="button"
                              onClick={() => handleComplete(job.id)}
                              className="w-full text-xs px-2 py-1 rounded font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
