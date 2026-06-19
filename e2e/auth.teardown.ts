import { test as teardown } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('.env') })

teardown('cleanup test workspace', async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  await supabase.from('lessons').delete().eq('workspace_id', 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa')
  await supabase.from('workspaces').delete().eq('id', 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa')
})
