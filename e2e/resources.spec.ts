import { test, expect } from '@playwright/test'

test.describe('Resources', () => {
  test.describe('Resources Page Structure', () => {
    test('renders workspace tabs', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/resources')

      const chatTab = page.getByRole('link', { name: 'Chat' })
      const resourcesTab = page.getByRole('link', { name: 'Resources' })
      const roadmapTab = page.getByRole('link', { name: 'Roadmap' })

      await expect(chatTab).toBeVisible()
      await expect(resourcesTab).toBeVisible()
      await expect(roadmapTab).toBeVisible()
    })

    test('navigates to chat tab', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/resources')
      await page.getByRole('link', { name: 'Chat' }).click()
      await expect(page).toHaveURL('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
    })

    test('navigates to roadmap tab', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/resources')
      await page.getByRole('link', { name: 'Roadmap' }).click()
      await expect(page).toHaveURL('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')
    })
  })

  test.describe('Resource Gallery', () => {
    test('renders filter buttons', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/resources')

      const allButton = page.getByRole('button', { name: 'All' })
      const lessonsButton = page.getByRole('button', { name: 'Lessons' })
      const referencesButton = page.getByRole('button', { name: 'References' })
      const recordsButton = page.getByRole('button', { name: 'Records' })

      await expect(allButton).toBeVisible()
      await expect(lessonsButton).toBeVisible()
      await expect(referencesButton).toBeVisible()
      await expect(recordsButton).toBeVisible()
    })

    test('All filter is active by default', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/resources')

      const allButton = page.getByRole('button', { name: 'All' })
      await expect(allButton).toHaveAttribute('aria-pressed', 'true')
    })

    test('switching filters updates active state', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/resources')

      await page.getByRole('button', { name: 'Lessons' }).click()
      await expect(page.getByRole('button', { name: 'Lessons' })).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')

      await page.getByRole('button', { name: 'References' }).click()
      await expect(page.getByRole('button', { name: 'References' })).toHaveAttribute('aria-pressed', 'true')

      await page.getByRole('button', { name: 'Records' }).click()
      await expect(page.getByRole('button', { name: 'Records' })).toHaveAttribute('aria-pressed', 'true')
    })

    test('shows resources when they exist', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/resources')

      // The test lesson created in auth setup should be visible
      await expect(page.getByRole('heading', { name: 'Test Lesson' })).toBeVisible({ timeout: 10000 })
    })

    test('filters resources by type', async ({ page }) => {
      // Navigate to page with URL params that trigger resource gallery rendering
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/resources')

      // Find and click each filter button to verify they work
      const filters = ['All', 'Lessons', 'References', 'Records']

      for (const filter of filters) {
        const button = page.getByRole('button', { name: filter })
        await expect(button).toBeVisible()
        await button.click()
        await expect(button).toHaveAttribute('aria-pressed', 'true')
      }
    })
  })
})
