import { test, expect } from '@playwright/test'

test.describe('Dashboard and Workspaces', () => {

  test.describe('Workspace List', () => {
    test('renders workspace creation form', async ({ page }) => {
      await page.goto('/')

      const workspaceInput = page.getByLabel('Workspace name')
      await expect(workspaceInput).toBeVisible()
      await expect(workspaceInput).toHaveAttribute('placeholder', 'What do you want to learn?')

      await expect(page.getByRole('button', { name: 'Start Learning' })).toBeVisible()
    })

    test('shows add learning goal option', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByText('+ Add learning goal (optional)')).toBeVisible()
    })

    test('add learning goal expands textarea', async ({ page }) => {
      await page.goto('/')

      await page.getByText('+ Add learning goal (optional)').click()
      const missionTextarea = page.getByPlaceholder("What's your goal for learning this topic?")
      await expect(missionTextarea).toBeVisible()
    })

    test('create button is disabled when topic is empty', async ({ page }) => {
      await page.goto('/')
      const createButton = page.getByRole('button', { name: 'Start Learning' })
      await expect(createButton).toBeDisabled()
    })

    test('create button is enabled when topic is entered', async ({ page }) => {
      await page.goto('/')
      await page.getByLabel('Workspace name').fill('Learn Python')
      const createButton = page.getByRole('button', { name: 'Start Learning' })
      await expect(createButton).toBeEnabled()
    })
  })

  test.describe('Workspace CRUD (Mocked API)', () => {
    test.beforeEach(async ({ page }) => {
      // Mock the Supabase auth to return a valid user
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-id',
            email: 'test@example.com',
          }),
        })
      })
    })

    test('creates a workspace via API', async ({ page }) => {
      let createRequest: Record<string, unknown> | null = null

      await page.route('**/api/workspaces', async (route) => {
        if (route.request().method() === 'POST') {
          createRequest = await route.request().postDataJSON()
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'new-ws-id',
              topic: createRequest?.topic || '',
              mission: createRequest?.mission || null,
              created_at: new Date().toISOString(),
            }),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          })
        }
      })

      await page.goto('/')

      await page.getByLabel('Workspace name').fill('Test Topic')
      await page.getByRole('button', { name: 'Start Learning' }).click()

      await expect(createRequest).not.toBeNull()
      expect(createRequest?.topic).toBe('Test Topic')
    })

    test('creates a workspace with mission', async ({ page }) => {
      let createRequestBody: Record<string, unknown> | null = null

      await page.route('**/api/workspaces/**', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      await page.route('**/api/workspaces', async (route) => {
        if (route.request().method() === 'POST') {
          createRequestBody = await route.request().postDataJSON()
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'new-ws-id',
              topic: createRequestBody?.topic || '',
              mission: createRequestBody?.mission || null,
              created_at: new Date().toISOString(),
            }),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          })
        }
      })

      await page.goto('/')

      await page.getByLabel('Workspace name').fill('Python for Data Science')
      await page.getByText('+ Add learning goal (optional)').click()
      await page.getByPlaceholder("What's your goal for learning this topic?").fill('Build a data pipeline')
      await page.getByRole('button', { name: 'Start Learning' }).click()

      expect(createRequestBody?.topic).toBe('Python for Data Science')
      expect(createRequestBody?.mission).toBe('Build a data pipeline')
    })

    test('shows error when workspace creation fails', async ({ page }) => {
      await page.route('**/api/workspaces', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server error. Please try again.' }),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          })
        }
      })

      await page.goto('/')

      await page.getByLabel('Workspace name').fill('Test Topic')
      await page.getByRole('button', { name: 'Start Learning' }).click()

      await expect(page.getByText(/Server error|Failed to create/i)).toBeVisible({ timeout: 5000 })
    })

    test('shows error when unauthenticated (401)', async ({ page }) => {
      await page.route('**/api/workspaces', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Please sign in to create a workspace.' }),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          })
        }
      })

      await page.goto('/')

      await page.getByLabel('Workspace name').fill('Test')
      await page.getByRole('button', { name: 'Start Learning' }).click()

      await expect(page.getByText('Please sign in to create a workspace.')).toBeVisible({ timeout: 5000 })
    })
  })
})
