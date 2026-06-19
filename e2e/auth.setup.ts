import { test as setup, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve('.env') })

const AUTH_FILE = path.resolve('e2e/.auth/user.json')

setup('authenticate as test user', async ({ page }) => {
  await page.goto('/login')

  await page.getByPlaceholder('you@example.com').fill('test@test.com')
  await page.getByPlaceholder('••••••••').fill('Password1;')
  await page.getByRole('button', { name: 'Sign In' }).click()

  await page.waitForURL('/')
  await expect(page.getByText('My Workspaces')).toBeVisible()

  // Create test workspace with known ID for E2E tests
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Look up user by email using admin API
  const { data: users } = await supabase.auth.admin.listUsers()
  const testUser = users?.users?.find(u => u.email === 'test@test.com')
  if (testUser) {
    // Delete any leftover workspace from previous runs
    await supabase.from('workspaces').delete().eq('id', 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa')

    await supabase.from('workspaces').insert({
      id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
      user_id: testUser.id,
      topic: 'E2E Test Workspace',
      created_at: new Date().toISOString(),
    })

    // Add a test lesson so the ResourceGallery renders with content
    const { data: existing } = await supabase
      .from('lessons')
      .select('id')
      .eq('workspace_id', 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa')
      .eq('slug', 'test-lesson')
      .maybeSingle()

    if (existing) {
      await supabase.from('lessons').update({
        title: 'Test Lesson',
        content: '<p>Test content</p>',
        version: 1,
      }).eq('id', existing.id)
    } else {
      await supabase.from('lessons').insert({
        workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
        slug: 'test-lesson',
        title: 'Test Lesson',
        content: '<p>Test content</p>',
        order: 1,
      })
    }
  }

  await page.context().storageState({ path: AUTH_FILE })
})
