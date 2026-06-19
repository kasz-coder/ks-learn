'use client'

import { useState } from 'react'
import type { Roadmap, RoadmapStepStatus } from '@/lib/types'

const statusConfig: Record<RoadmapStepStatus, { circle: string; text: string; line: string }> = {
  upcoming: {
    circle: 'border-zinc-300 bg-white text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500',
    text: 'text-zinc-600 dark:text-zinc-400',
    line: 'bg-zinc-200 dark:bg-zinc-700',
  },
  in_progress: {
    circle: 'border-blue-500 bg-blue-500 text-white',
    text: 'text-zinc-900 font-semibold dark:text-zinc-100',
    line: 'bg-blue-400',
  },
  completed: {
    circle: 'border-green-500 bg-green-500 text-white',
    text: 'text-zinc-500 line-through dark:text-zinc-500',
    line: 'bg-green-400',
  },
}

function StepIcon({ status }: { status: RoadmapStepStatus }) {
  if (status === 'completed') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    )
  }
  return null
}

export function RoadmapView({ roadmap, workspaceId }: { roadmap: Roadmap; workspaceId: string }) {
  const [steps, setSteps] = useState(roadmap.steps)
  const [loadingOrder, setLoadingOrder] = useState<number | null>(null)
  const completed = steps.filter(s => s.status === 'completed').length
  const total = steps.length

  const toggleStatus = async (order: number, current: RoadmapStepStatus) => {
    const next: RoadmapStepStatus = current === 'completed' ? 'upcoming' : 'completed'
    setLoadingOrder(order)
    setSteps(prev => prev.map(s => s.order === order ? { ...s, status: next } : s))
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/roadmap`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, status: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setSteps(roadmap.steps)
    } finally {
      setLoadingOrder(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{roadmap.title}</h1>
        <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">{roadmap.goal}</p>
        <div className="mt-2 sm:mt-3 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <span className={completed === total ? 'text-green-600 font-medium' : ''}>
            {completed} / {total} steps completed
          </span>
          {completed === total && (
            <span className="ml-1">🎉</span>
          )}
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-500"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="relative">
        {steps.map((step, i) => {
          const config = statusConfig[step.status]
          const isLast = i === steps.length - 1
          return (
            <div key={step.order} className="relative flex gap-3 sm:gap-4 pb-5 sm:pb-8">
              {!isLast && (
                <div className={`absolute left-[13px] sm:left-[15px] top-7 sm:top-8 w-0.5 h-full -translate-x-1/2 ${config.line}`} />
              )}
              <div className={`relative shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${config.circle}`}>
                {StepIcon({ status: step.status }) || step.order}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-sm ${config.text}`}>{step.title}</h3>
                  <button
                    onClick={() => toggleStatus(step.order, step.status)}
                    disabled={loadingOrder === step.order}
                    className={`shrink-0 text-xs px-2 py-1 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      step.status === 'completed'
                        ? 'text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950'
                        : 'text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950'
                    }`}
                  >
                    {loadingOrder === step.order ? (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : step.status === 'completed' ? 'Undo' : 'Done'}
                  </button>
                </div>
                {step.description && (
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RoadmapEmptyState() {
  return (
    <div className="mx-auto max-w-3xl text-center py-16">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
        <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">No roadmap yet</h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Ask the AI in Chat to create a learning roadmap. It will outline the steps from where you are now to your goal.
      </p>
    </div>
  )
}
