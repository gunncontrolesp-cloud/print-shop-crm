'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateJobStage, completeJob } from '@/lib/actions/jobs'
import { JOB_STAGE_SEQUENCE, type JobStage } from '@/lib/types'

type Job = {
  id: string
  order_id: string
  stage: JobStage
  notes: string | null
  completed_at: string | null
  created_at: string
  orders: {
    total: number
    line_items: unknown[]
    customers: { name: string } | null
  } | null
}

const STAGES: { id: JobStage; label: string; color: string }[] = [
  { id: 'design', label: 'Design', color: 'bg-blue-500' },
  { id: 'proofing', label: 'Proofing', color: 'bg-purple-500' },
  { id: 'printing', label: 'Printing', color: 'bg-yellow-500' },
  { id: 'finishing', label: 'Finishing', color: 'bg-orange-500' },
  { id: 'ready_for_pickup', label: 'Ready for Pickup', color: 'bg-green-500' },
]

const STAGE_BUTTON_CLASSES: Record<JobStage, string> = {
  design: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200',
  proofing: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200',
  printing: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200',
  finishing: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200',
  ready_for_pickup: 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200',
}

export function ProductionBoard({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)

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
                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                <h3 className="text-sm font-semibold text-gray-800">{stage.label}</h3>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                {stageJobs.length}
              </span>
            </div>

            {/* Job cards */}
            <div className="flex flex-col gap-2 flex-1">
              {stageJobs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No jobs</p>
              ) : (
                stageJobs.map((job) => {
                  const customer = job.orders?.customers
                  const lineItemCount = Array.isArray(job.orders?.line_items)
                    ? job.orders!.line_items.length
                    : 0

                  return (
                    <div
                      key={job.id}
                      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {customer?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        #{job.order_id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {lineItemCount} item{lineItemCount !== 1 ? 's' : ''} ·{' '}
                        {new Date(job.created_at).toLocaleDateString('en-US')}
                      </p>

                      <div className="mt-2 flex flex-col gap-1">
                        {nextStage && (
                          <button
                            type="button"
                            onClick={() => updateJobStage(job.id, nextStage)}
                            className={`w-full text-xs px-2 py-1 rounded font-medium transition-colors ${STAGE_BUTTON_CLASSES[nextStage]}`}
                          >
                            Move to {STAGES.find((s) => s.id === nextStage)?.label}
                          </button>
                        )}
                        {stage.id === 'ready_for_pickup' && (
                          <button
                            type="button"
                            onClick={() => completeJob(job.id)}
                            className="w-full text-xs px-2 py-1 rounded font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
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
  )
}
