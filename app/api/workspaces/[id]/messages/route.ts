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

  const url = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 100)
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0)

  const { data, error, count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: false })
    .eq('workspace_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })

  const messages = (data || []).reverse()

  return NextResponse.json({ messages, total: count })
}

export async function DELETE(
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

  let body: { messageIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.messageIds?.length) {
    return NextResponse.json({ error: 'messageIds required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('workspace_id', id)
    .in('id', body.messageIds)

  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
