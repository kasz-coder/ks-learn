import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const tableMap: Record<string, string> = {
  lesson: 'lessons',
  reference: 'references_doc',
  learning_record: 'learning_records',
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const type = request.nextUrl.searchParams.get('type')

  if (!type || !tableMap[type]) {
    return NextResponse.json({ error: 'Invalid or missing resource type' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient(request)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const table = tableMap[type]

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete resource:', { userId: user.id, resourceId: id, type, error: error.message })
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
