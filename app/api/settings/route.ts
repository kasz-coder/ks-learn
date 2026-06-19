import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  language: z.string().min(1).max(50),
})

const DEFAULT_SETTINGS = { language: 'English' }

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_settings')
    .select('language')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json(data || DEFAULT_SETTINGS)
}

export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = updateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('user_settings')
      .update({ language: parsed.data.language, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('user_settings')
      .insert({ user_id: user.id, language: parsed.data.language })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ language: parsed.data.language })
}
