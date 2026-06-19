import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createSupabaseServerClient(request)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, workspace_id, version, title, content')
    .eq('id', id)
    .single()

  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', lesson.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!ws) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: history } = await supabase
    .from('lesson_versions')
    .select('version, title, content, created_at')
    .eq('lesson_id', id)
    .order('version', { ascending: true })

  return NextResponse.json({
    current: { version: lesson.version, title: lesson.title, content: lesson.content },
    history: history || [],
  })
}
