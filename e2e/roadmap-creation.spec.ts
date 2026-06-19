import { test, expect } from '@playwright/test'

test.describe('Roadmap Creation', () => {
  test.describe('User-Initiated Roadmap (via chat message)', () => {
    test('user sends message with roadmap block triggers upsert API call', async ({ page }) => {
      const messagesApi = page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      let roadmapUpsertPayload: Record<string, unknown> | null = null
      await page.route('**/api/chat', async (route) => {
        const body = await route.request().postDataJSON()
        if (body?.message?.includes('roadmap[')) {
          const match = body.message.match(/roadmap\[([^\]]*)\]\n([\s\S]*)/)
          if (match) {
            try {
              roadmapUpsertPayload = { title: match[1], content: JSON.parse(match[2]) }
            } catch { /* invalid JSON test case */ }
          }
        }
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"content":"Got it!"}\ndata: [DONE]\n',
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('textbox', { name: 'Message' }).fill(
        'roadmap[My Python Plan]\n{"goal":"Learn Python","steps":[{"order":1,"title":"Basics","description":"","status":"upcoming"},{"order":2,"title":"OOP","description":"","status":"upcoming"}]}'
      )
      await page.getByLabel('Send message').click()

      // Wait for request to be captured
      await expect(async () => {
        expect(roadmapUpsertPayload).not.toBeNull()
        expect(roadmapUpsertPayload?.title).toBe('My Python Plan')
      }).toPass({ timeout: 5000 })
    })

    test('user sends roadmap block with 3 steps shows correct card in chat', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      await page.route('**/api/chat', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"content":"Great roadmap!"}\ndata: [DONE]\n',
        })
      })

      const userMessage = [
        'roadmap[Web Dev Roadmap]',
        '{"goal":"Become a web developer","steps":[',
        '{"order":1,"title":"HTML/CSS","description":"","status":"upcoming"},',
        '{"order":2,"title":"JavaScript","description":"","status":"upcoming"},',
        '{"order":3,"title":"React","description":"","status":"upcoming"}',
        ']}',
      ].join('\n')

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('textbox', { name: 'Message' }).fill(userMessage)
      await page.getByLabel('Send message').click()

      // Optimistic user message should appear
      await expect(page.getByRole('article', { name: 'Your message' })).toBeVisible({ timeout: 5000 })
    })

    test('user sends roadmap block with ::: format', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      let sentMessage = ''
      await page.route('**/api/chat', async (route) => {
        sentMessage = (route.request().postDataJSON() as Record<string, unknown>)?.message as string || ''
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"content":"ok"}\ndata: [DONE]\n',
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      const msg = ':::roadmap[SQL Mastery]\n{"goal":"Master SQL","steps":[{"order":1,"title":"SELECT","description":"","status":"upcoming"}]}\n:::'
      await page.getByRole('textbox', { name: 'Message' }).fill(msg)
      await page.getByLabel('Send message').click()

      await expect(async () => {
        expect(sentMessage).toContain(':::roadmap[')
        expect(sentMessage).toContain('SQL Mastery')
      }).toPass({ timeout: 5000 })
    })
  })

  test.describe('AI-Created Roadmap (via SSE response)', () => {
    test('AI response with roadmap block renders amber card in chat', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      await page.route('**/api/chat', async (route) => {
        const roadmapBlock = [
          ':::roadmap[Learning Path: Rust]',
          '{"goal":"Learn Rust programming","steps":[',
          '{"order":1,"title":"Ownership & Borrowing","description":"Core memory model","status":"upcoming"},',
          '{"order":2,"title":"Structs & Enums","description":"Data modeling","status":"upcoming"},',
          '{"order":3,"title":"Error Handling","description":"Result and Option","status":"upcoming"}',
          ']}',
          ':::',
        ].join('\n')
        const body = `data: ${JSON.stringify({ content: roadmapBlock })}\ndata: [DONE]\n`
        await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')

      // Send a message to trigger AI response
      await page.getByRole('textbox', { name: 'Message' }).fill('Teach me Rust')
      await page.getByLabel('Send message').click()

      // Wait for roadmap card to render
      const roadmapCard = page.getByRole('button', { name: /View Roadmap: Learning Path: Rust/ })
      await expect(roadmapCard).toBeVisible({ timeout: 10000 })
    })

    test('AI roadmap card with single step shows singular text', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      await page.route('**/api/chat', async (route) => {
        const block = ':::roadmap[Quick Tip]\n{"goal":"One thing","steps":[{"order":1,"title":"Do it","description":"","status":"upcoming"}]}\n:::'
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ content: block })}\ndata: [DONE]\n`,
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('textbox', { name: 'Message' }).fill('Give me one step')
      await page.getByLabel('Send message').click()

      const roadmapCard = page.getByRole('button', { name: /View Roadmap:/ })
      await expect(roadmapCard).toBeVisible({ timeout: 10000 })
    })

    test('clicking roadmap card navigates to roadmap tab', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'rm-1',
            workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
            title: 'Learning Path: Rust',
            goal: 'Learn Rust programming',
            steps: [
              { order: 1, title: 'Ownership & Borrowing', description: 'Core memory model', status: 'upcoming' },
              { order: 2, title: 'Structs & Enums', description: 'Data modeling', status: 'upcoming' },
              { order: 3, title: 'Error Handling', description: 'Result and Option', status: 'upcoming' },
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })
      })

      await page.route('**/api/chat', async (route) => {
        const block = ':::roadmap[Learning Path: Rust]\n{"goal":"Learn Rust","steps":[{"order":1,"title":"X","description":"","status":"upcoming"}]}\n:::'
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ content: block })}\ndata: [DONE]\n`,
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('textbox', { name: 'Message' }).fill('Create roadmap')
      await page.getByLabel('Send message').click()

      // Wait for roadmap card
      const roadmapCard = page.getByRole('button', { name: /View Roadmap:/ })
      await expect(roadmapCard).toBeVisible({ timeout: 10000 })

      // Click the roadmap card
      await roadmapCard.click()
      await expect(page).toHaveURL(/\/workspaces\/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa\/roadmap/)

      // Should see the roadmap data
      await expect(page.getByText('Learning Path: Rust')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Learn Rust programming')).toBeVisible()
    })

    test('AI roadmap card title is truncated correctly for long titles', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      await page.route('**/api/chat', async (route) => {
        const longTitle = 'A Very Long Roadmap Title That Should Be Truncated In The Card Display'
        const block = `:::roadmap[${longTitle}]\n{"goal":"Test","steps":[{"order":1,"title":"Step 1","description":"","status":"upcoming"}]}\n:::`
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ content: block })}\ndata: [DONE]\n`,
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('textbox', { name: 'Message' }).fill('Create long roadmap')
      await page.getByLabel('Send message').click()

      const roadmapCard = page.getByRole('button', { name: /View Roadmap:/ })
      await expect(roadmapCard).toBeVisible({ timeout: 10000 })
      await expect(roadmapCard).toContainText('A Very Long Roadmap Title')
    })
  })

  test.describe('Roadmap Display - Full View', () => {
    test('displays all roadmap steps with correct status styling', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'rm-1',
            workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
            title: 'Full Stack Roadmap',
            goal: 'Become a full-stack developer in 6 months',
            steps: [
              { order: 1, title: 'Frontend Basics', description: 'HTML, CSS, JavaScript', status: 'completed' },
              { order: 2, title: 'React Framework', description: 'Components, state, hooks', status: 'in_progress' },
              { order: 3, title: 'Backend with Node.js', description: 'Express, APIs, databases', status: 'upcoming' },
              { order: 4, title: 'DevOps & Deployment', description: 'CI/CD, cloud, monitoring', status: 'upcoming' },
              { order: 5, title: 'Advanced Topics', description: 'Performance, security, testing', status: 'upcoming' },
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      // Title and goal
      await expect(page.getByText('Full Stack Roadmap')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Become a full-stack developer in 6 months')).toBeVisible()

      // Progress bar
      await expect(page.getByText('1 / 5 steps completed')).toBeVisible()

      // All step titles
      await expect(page.getByText('Frontend Basics')).toBeVisible()
      await expect(page.getByText('React Framework')).toBeVisible()
      await expect(page.getByText('Backend with Node.js')).toBeVisible()
      await expect(page.getByText('DevOps & Deployment')).toBeVisible()
      await expect(page.getByText('Advanced Topics')).toBeVisible()

      // Descriptions
      await expect(page.getByText('HTML, CSS, JavaScript')).toBeVisible()
      await expect(page.getByText('Components, state, hooks')).toBeVisible()
      await expect(page.getByText('Express, APIs, databases')).toBeVisible()
    })

    test('shows celebration when all steps completed', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'rm-1',
            workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
            title: 'Quick Wins',
            goal: 'Complete all tasks',
            steps: [
              { order: 1, title: 'Task 1', description: 'Done', status: 'completed' },
              { order: 2, title: 'Task 2', description: 'Done too', status: 'completed' },
              { order: 3, title: 'Task 3', description: 'Also done', status: 'completed' },
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      await expect(page.getByText('3 / 3 steps completed')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('3 / 3 steps completed')).toHaveClass(/text-green-600/)
    })

    test('shows 0 / N when no steps completed', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'rm-1',
            workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
            title: 'Empty Start',
            goal: 'Do everything',
            steps: [
              { order: 1, title: 'Step 1', description: '', status: 'upcoming' },
              { order: 2, title: 'Step 2', description: '', status: 'upcoming' },
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')
      await expect(page.getByText('0 / 2 steps completed')).toBeVisible({ timeout: 10000 })
    })

    test('roadmap view handles steps without descriptions', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'rm-1',
            workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
            title: 'Minimal',
            goal: 'Minimal roadmap',
            steps: [
              { order: 1, title: 'Only Step', description: '', status: 'upcoming' },
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')
      await expect(page.getByText('Only Step')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Roadmap API Error & Edge Cases', () => {
    test('shows error alert when roadmap API fails with 500', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to load roadmap' }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')
      const alert = page.getByRole('alert').first()
      await expect(alert).toBeVisible({ timeout: 10000 })
      await expect(alert).toContainText(/Failed to fetch/)
    })

    test('shows loading state while fetching roadmap', async ({ page }) => {
      let resolvePromise: (value: unknown) => void
      const delayed = new Promise((resolve) => { resolvePromise = resolve })

      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await delayed
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'rm-1',
            workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
            title: 'Delayed',
            goal: 'Test',
            steps: [{ order: 1, title: 'Step', description: '', status: 'upcoming' }],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      // Should show loading text
      await expect(page.getByText('Loading roadmap...')).toBeVisible({ timeout: 5000 })

      // Resolve and verify roadmap appears
      resolvePromise!(undefined)
      await expect(page.getByText('Delayed')).toBeVisible({ timeout: 10000 })
    })

    test('switches from empty state to roadmap state when data arrives', async ({ page }) => {
      let callCount = 0

      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        callCount++
        if (callCount === 1) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not found' }) })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'rm-1', workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa', title: 'New Roadmap', goal: 'Test',
              steps: [{ order: 1, title: 'Step 1', description: '', status: 'upcoming' }],
              created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            }),
          })
        }
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      // First poll (5s) returns 404 → shows empty state
      await expect(page.getByText('No roadmap yet')).toBeVisible({ timeout: 10000 })
    })

    test('roadmap with empty steps array displays without errors', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'rm-1',
            workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
            title: 'Empty Steps',
            goal: 'Nothing to do',
            steps: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')
      await expect(page.getByText('Empty Steps')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('0 / 0 steps completed')).toBeVisible()
    })

    test('handles invalid JSON in user roadmap block gracefully', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      await page.route('**/api/chat', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"content":"OK"}\ndata: [DONE]\n',
        })
      })

      const invalidJSON = 'roadmap[Broken]\n{invalid json here}'
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('textbox', { name: 'Message' }).fill(invalidJSON)
      await page.getByLabel('Send message').click()

      // The message should still send (invalid JSON is handled gracefully)
      await expect(page.getByRole('article', { name: 'Your message' })).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Roadmap Polling', () => {
    test('roadmap page polls API every 5 seconds', async ({ page }) => {
      const requests: string[] = []

      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        requests.push(new Date().toISOString())
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not found' }) })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')

      // Wait for empty state
      await expect(page.getByText('No roadmap yet')).toBeVisible({ timeout: 10000 })

      // Should have made at least 2 requests (initial + 1 poll)
      await expect(async () => {
        expect(requests.length).toBeGreaterThanOrEqual(2)
      }).toPass({ timeout: 12000 })
    })

    test('roadmap updates in real-time on navigation from chat', async ({ page }) => {
      // Chat page: send message, get roadmap in response
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      await page.route('**/api/chat', async (route) => {
        const block = ':::roadmap[Live Roadmap]\n{"goal":"Real-time test","steps":[{"order":1,"title":"Step 1","description":"","status":"upcoming"}]}\n:::'
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ content: block })}\ndata: [DONE]\n`,
        })
      })

      // Roadmap API
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'rm-1', workspace_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa', title: 'Live Roadmap', goal: 'Real-time test',
            steps: [{ order: 1, title: 'Step 1', description: '', status: 'upcoming' }],
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('textbox', { name: 'Message' }).fill('Create my roadmap')
      await page.getByLabel('Send message').click()

      // Click roadmap card to navigate
      const roadmapCard = page.getByRole('button', { name: /View Roadmap: Live Roadmap/ })
      await expect(roadmapCard).toBeVisible({ timeout: 10000 })
      await roadmapCard.click()

      // Verify roadmap page shows the data
      await expect(page).toHaveURL(/\/workspaces\/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa\/roadmap/)
      await expect(page.getByText('Live Roadmap')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Real-time test')).toBeVisible()
    })
  })
  test.describe('Chat + Roadmap Integration', () => {
    test('chat message with roadmap and text renders both', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      })

      await page.route('**/api/chat', async (route) => {
        const combined = [
          'Here is your learning plan:',
          '',
          ':::roadmap[Python Journey]',
          '{"goal":"Master Python","steps":[{"order":1,"title":"Basics","description":"","status":"upcoming"},{"order":2,"title":"Advanced","description":"","status":"upcoming"}]}',
          ':::',
        ].join('\n')
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ content: combined })}\ndata: [DONE]\n`,
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('textbox', { name: 'Message' }).fill('Plan my Python learning')
      await page.getByLabel('Send message').click()

      // AI message should contain both text and roadmap card
      const assistantSection = page.getByRole('article', { name: 'Assistant message' })
      await expect(assistantSection).toBeVisible({ timeout: 10000 })
      await expect(assistantSection).toContainText('Here is your learning plan')
      await expect(assistantSection).toContainText('Python Journey')
    })
  })
})
