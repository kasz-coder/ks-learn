'use client'

import { useState } from 'react'
import { ResourceCard } from './resource-card'
import type { Resource } from '@/lib/types'

const filterLabels: Record<string, string> = {
  lesson: 'Lessons',
  reference: 'References',
  learning_record: 'Records',
}

export function ResourceGallery({ resources, loading }: { resources: Resource[]; loading?: boolean }) {
  const [filter, setFilter] = useState<string>('lesson')
  const [items, setItems] = useState<Resource[]>(resources)

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((r) => r.id !== id))
  }

  const filtered = filter === ''
    ? items
    : items.filter((r) => r.type === filter)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5 sm:gap-2">
        {(['lesson', 'reference', 'learning_record'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(filter === type ? '' : type)}
            aria-pressed={filter === type}
            className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${
              filter === type
                ? 'bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            {filterLabels[type]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-zinc-200 rounded-xl overflow-hidden dark:bg-zinc-800 dark:border-zinc-700"
            >
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-16 rounded-md bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                  <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                </div>
                <div className="h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
              </div>
              <div className="border-t border-zinc-100 dark:border-zinc-700 h-28 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filter ? `No ${filterLabels[filter].toLowerCase()} found.` : 'No resources yet. Start chatting to generate lessons and references.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
