import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient(request)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete workspace (cascades to related tables)
  const { error } = await supabase.from('workspaces').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
