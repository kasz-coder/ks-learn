import { createSupabaseServerClient } from '@/lib/supabase-server'
import { WorkspaceList } from '@/components/workspace/workspace-list'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl text-center py-20">
        <p className="text-zinc-500 dark:text-zinc-400">Please sign in.</p>
      </div>
    )
  }

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const wsIds = (workspaces || []).map(ws => ws.id)

  const [lessonsResult, refsResult] = await Promise.all([
    wsIds.length > 0
      ? supabase.from('lessons').select('workspace_id').in('workspace_id', wsIds)
      : Promise.resolve({ data: [] }),
    wsIds.length > 0
      ? supabase.from('references_doc').select('workspace_id').in('workspace_id', wsIds)
      : Promise.resolve({ data: [] }),
  ])

  const lessonCounts: Record<string, number> = {}
  const refCounts: Record<string, number> = {}
  for (const l of lessonsResult.data || []) {
    lessonCounts[l.workspace_id] = (lessonCounts[l.workspace_id] || 0) + 1
  }
  for (const r of refsResult.data || []) {
    refCounts[r.workspace_id] = (refCounts[r.workspace_id] || 0) + 1
  }

  const wsList = (workspaces || []).map(ws => ({
    ...ws,
    lesson_count: lessonCounts[ws.id] || 0,
    ref_count: refCounts[ws.id] || 0,
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">My Workspaces</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Manage your learning spaces</p>
      </div>
      <WorkspaceList workspaces={wsList} />
    </div>
  )
}
