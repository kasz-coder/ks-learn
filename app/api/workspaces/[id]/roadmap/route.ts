import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient(request)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('workspace_id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Failed to load roadmap' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient(request)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { order, status } = body as { order: number; status: string }
  if (typeof order !== 'number' || !['upcoming', 'in_progress', 'completed'].includes(status as string)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: roadmap, error: fetchError } = await supabase
    .from('roadmaps')
    .select('steps')
    .eq('workspace_id', id)
    .single()

  if (fetchError || !roadmap) {
    return NextResponse.json({ error: 'No roadmap found' }, { status: 404 })
  }

  const steps = [...(roadmap.steps as { order: number; title: string; description: string; status: string }[])]
  if (order < 0 || order >= steps.length) {
    return NextResponse.json({ error: 'Invalid step order' }, { status: 400 })
  }
  steps[order] = { ...steps[order], status }

  const { error: updateError } = await supabase
    .from('roadmaps')
    .update({ steps, updated_at: new Date().toISOString() })
    .eq('workspace_id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update roadmap' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
