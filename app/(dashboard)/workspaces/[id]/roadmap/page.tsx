'use client'

import { useEffect, useState } from 'react'
import { WorkspaceTabs } from '@/components/workspace/workspace-tabs'
import { RoadmapView, RoadmapEmptyState } from '@/components/roadmap/roadmap-view'
import type { Roadmap, RoadmapStep } from '@/lib/types'

export default function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ id }) => setWorkspaceId(id))
  }, [params])

  useEffect(() => {
    if (!workspaceId) return

    let active = true

    async function fetchRoadmap() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/roadmap`)
        if (!res.ok) {
          if (res.status === 404) {
            if (active) setRoadmap(null)
            return
          }
          throw new Error(`Failed to fetch roadmap (${res.status})`)
        }
        const data = await res.json()
        if (active) {
          setRoadmap({
            id: data.id,
            workspace_id: data.workspace_id,
            title: data.title,
            goal: data.goal || '',
            steps: (Array.isArray(data.steps) ? data.steps : []) as RoadmapStep[],
            created_at: data.created_at,
            updated_at: data.updated_at,
          })
          setError(null)
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Failed to load roadmap')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchRoadmap()

    let interval = setInterval(fetchRoadmap, 5000)

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchRoadmap()
        interval = setInterval(fetchRoadmap, 5000)
      } else {
        clearInterval(interval)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [workspaceId])

  if (!workspaceId) return null

  return (
    <div className="mx-auto max-w-6xl">
      <WorkspaceTabs workspaceId={workspaceId} />
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        {loading ? (
          <div className="mx-auto max-w-3xl py-16 text-center text-sm text-zinc-400">Loading roadmap...</div>
        ) : roadmap ? (
          <RoadmapView roadmap={roadmap} workspaceId={workspaceId} />
        ) : (
          <RoadmapEmptyState />
        )}
      </div>
    </div>
  )
}
