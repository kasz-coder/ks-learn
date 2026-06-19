import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { ResourceGallery } from '@/components/resources/resource-gallery'
import { WorkspaceTabs } from '@/components/workspace/workspace-tabs'

export default async function ResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!workspace) notFound()

  const [lessons, refs, records] = await Promise.all([
    supabase.from('lessons').select('*').eq('workspace_id', id).order('order', { ascending: true }),
    supabase.from('references_doc').select('*').eq('workspace_id', id).order('created_at', { ascending: false }),
    supabase.from('learning_records').select('*').eq('workspace_id', id).order('created_at', { ascending: false }),
  ])

  const hasError = lessons.error || refs.error || records.error

  const resources = [
    ...(lessons.data || []).map(l => ({ ...l, type: 'lesson' as const })),
    ...(refs.data || []).map(r => ({ ...r, type: 'reference' as const })),
    ...(records.data || []).map(lr => ({ ...lr, type: 'learning_record' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="mx-auto max-w-6xl">
      <WorkspaceTabs workspaceId={id} />
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Resources</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{workspace.topic}</p>
        </div>
        {hasError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            Failed to load resources. Please try again later.
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 dark:text-zinc-400">No resources yet.</p>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">Start a conversation in Chat to generate lessons and references.</p>
          </div>
        ) : (
          <ResourceGallery resources={resources} />
        )}
      </div>
    </div>
  )
}
