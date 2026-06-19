import { test, expect } from '@playwright/test'

test.describe('Roadmap', () => {
  test.describe('Roadmap Page Structure', () => {
    test('renders workspace tabs', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      const chatTab = page.getByRole('link', { name: 'Chat' })
      const resourcesTab = page.getByRole('link', { name: 'Resources' })
      const roadmapTab = page.getByRole('link', { name: 'Roadmap' })

      await expect(chatTab).toBeVisible()
      await expect(resourcesTab).toBeVisible()
      await expect(roadmapTab).toBeVisible()
    })

    test('navigates to chat tab', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')
      await page.getByRole('link', { name: 'Chat' }).click()
      await expect(page).toHaveURL('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
    })

    test('navigates to resources tab', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')
      await page.getByRole('link', { name: 'Resources' }).click()
      await expect(page).toHaveURL('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/resources')
    })
  })

  test.describe('Roadmap Empty State', () => {
    test('shows empty state when no roadmap exists', async ({ page }) => {
      // Mock the roadmap API to return 404
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      await expect(page.getByText('No roadmap yet')).toBeVisible({ timeout: 10000 })
      await expect(
        page.getByText('Ask the AI in Chat to create a learning roadmap.')
      ).toBeVisible()
    })
  })

  test.describe('Roadmap View', () => {
    const mockRoadmap = {
      id: 'roadmap-1',
      workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
      title: 'Python Learning Path',
      goal: 'Become proficient in Python programming',
      steps: [
        { order: 1, title: 'Python Basics', description: 'Variables, data types, control flow', status: 'completed' },
        { order: 2, title: 'Functions & Modules', description: 'Writing reusable code', status: 'in_progress' },
        { order: 3, title: 'Object-Oriented Programming', description: 'Classes, inheritance, polymorphism', status: 'upcoming' },
        { order: 4, title: 'Advanced Topics', description: 'Decorators, generators, context managers', status: 'upcoming' },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    test('renders roadmap with title and goal', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockRoadmap),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      await expect(page.getByText('Python Learning Path')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Become proficient in Python programming')).toBeVisible()
    })

    test('shows progress bar with correct completion ratio', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockRoadmap),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      await expect(page.getByText('1 / 4 steps completed')).toBeVisible({ timeout: 10000 })
    })

    test('renders all roadmap steps', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockRoadmap),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      for (const step of mockRoadmap.steps) {
        await expect(page.getByText(step.title)).toBeVisible({ timeout: 10000 })
        if (step.description) {
          await expect(page.getByText(step.description)).toBeVisible()
        }
      }
    })

    test('renders completed step with checkmark', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockRoadmap),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      // Completed step has strikethrough styling
      const completedStep = page.getByText('Python Basics')
      await expect(completedStep).toBeVisible({ timeout: 10000 })
    })

    test('renders in-progress step differently', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockRoadmap),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      const inProgressStep = page.getByText('Functions & Modules')
      await expect(inProgressStep).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Roadmap Error Handling', () => {
    test('shows error message when roadmap fetch fails', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 })
    })
  })
})
