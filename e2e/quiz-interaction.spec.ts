import { test, expect } from '@playwright/test'

const WORKSPACE_ID = 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa'

test.describe('Quiz interaction', () => {
  test('quiz buttons show feedback on click', async ({ page }) => {
    const lessonHtml = `<!DOCTYPE html><html><head></head><body>
<div class="quiz">
  <h3>Check Your Understanding</h3>
  <p>What is 2 + 2?</p>
  <div class="q" data-correct="false">3</div>
  <div class="q" data-correct="true">4</div>
  <div class="q" data-correct="false">5</div>
</div>
</body></html>`

    const messages = [
      {
        id: '1',
        role: 'assistant',
        content: `:::lesson[Quiz Test]\n${lessonHtml}\n:::`,
        created_at: new Date().toISOString(),
      },
    ]

    await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(messages),
      })
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
    await page.waitForTimeout(1000)

    const lessonCard = page.getByRole('listitem').filter({ hasText: 'Quiz Test' })
    await expect(lessonCard).toBeVisible({ timeout: 10000 })

    // Open the lesson in the full-screen viewer
    await lessonCard.click()

    const viewer = page.locator('iframe.flex-1.w-full')
    await expect(viewer).toBeVisible({ timeout: 5000 })

    // The quiz script should be injected
    const srcDoc = await viewer.getAttribute('srcdoc')
    expect(srcDoc).toContain('quiz-feedback')
    expect(srcDoc).toContain("opt.addEventListener('click'")

    // Click inside the iframe on the correct answer
    const frame = viewer.contentFrame()
    await expect(frame!.locator('.q')).toHaveCount(3)

    await frame!.locator('.q', { hasText: '4' }).click()

    // Feedback should appear
    const feedback = frame!.locator('.quiz-feedback')
    await expect(feedback).toBeVisible({ timeout: 3000 })
    await expect(feedback).toHaveText('Correct!')
  })

  test('wrong answer shows correct answer highlighted', async ({ page }) => {
    const lessonHtml = `<!DOCTYPE html><html><head></head><body>
<div class="quiz">
  <h3>Check Your Understanding</h3>
  <p>What is 3 + 3?</p>
  <div class="q" data-correct="false">5</div>
  <div class="q" data-correct="true">6</div>
</div>
</body></html>`

    const messages = [
      {
        id: '1',
        role: 'assistant',
        content: `:::lesson[Wrong Answer Test]\n${lessonHtml}\n:::`,
        created_at: new Date().toISOString(),
      },
    ]

    await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(messages),
      })
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
    await page.waitForTimeout(1000)

    const lessonCard = page.getByRole('listitem').filter({ hasText: 'Wrong Answer Test' })
    await expect(lessonCard).toBeVisible({ timeout: 10000 })
    await lessonCard.click()

    const viewer = page.locator('iframe.flex-1.w-full')
    await expect(viewer).toBeVisible({ timeout: 5000 })

    const frame = viewer.contentFrame()

    // Click wrong answer
    await frame!.locator('.q', { hasText: '5' }).click()

    // Feedback should show incorrect message
    const feedback = frame!.locator('.quiz-feedback')
    await expect(feedback).toBeVisible({ timeout: 3000 })
    await expect(feedback).toContainText('Not quite')
  })
})
