import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('renders login form with all elements', async ({ page }) => {
      await page.goto('/login')

      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
      await expect(page.getByText('Sign in to continue learning')).toBeVisible()
      await expect(page.getByText('Email')).toBeVisible()
      await expect(page.getByText('Password', { exact: true })).toBeVisible()
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
      await expect(page.getByPlaceholder('••••••••')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    })

    test('links to signup and password reset pages', async ({ page }) => {
      await page.goto('/login')

      const signupLink = page.getByRole('link', { name: 'Sign up' })
      await expect(signupLink).toBeVisible()
      await expect(signupLink).toHaveAttribute('href', '/signup')

      const forgotLink = page.getByRole('link', { name: 'Forgot password?' })
      await expect(forgotLink).toBeVisible()
      await expect(forgotLink).toHaveAttribute('href', '/reset-password')
    })

    test('password visibility toggle works', async ({ page }) => {
      await page.goto('/login')

      const passwordInput = page.getByPlaceholder('••••••••')
      const toggleButton = page.getByRole('button', { name: 'Show password' })

      await expect(passwordInput).toHaveAttribute('type', 'password')

      await toggleButton.click()
      await expect(passwordInput).toHaveAttribute('type', 'text')
      await expect(page.getByRole('button', { name: 'Hide password' })).toBeVisible()

      await page.getByRole('button', { name: 'Hide password' }).click()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('shows error on invalid credentials', async ({ page }) => {
      await page.goto('/login')

      // Mock Supabase auth to return an error
      await page.route('**/auth/v1/token**', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid login credentials', error_description: 'Invalid login credentials' }),
        })
      })

      await page.getByPlaceholder('you@example.com').fill('wrong@example.com')
      await page.getByPlaceholder('••••••••').fill('wrongpassword')
      await page.getByRole('button', { name: 'Sign In' }).click()

      await expect(page.getByText(/Invalid login credentials/i)).toBeVisible({ timeout: 10000 })
    })

    test('requires email and password fields', async ({ page }) => {
      await page.goto('/login')

      const emailInput = page.getByPlaceholder('you@example.com')
      const passwordInput = page.getByPlaceholder('••••••••')

      await expect(emailInput).toHaveAttribute('required', '')
      await expect(passwordInput).toHaveAttribute('required', '')
    })

    test('navigates to signup page via link', async ({ page }) => {
      await page.goto('/login')
      await page.getByRole('link', { name: 'Sign up' }).click()
      await expect(page).toHaveURL('/signup')
    })

    test('navigates to reset password page via link', async ({ page }) => {
      await page.goto('/login')
      await page.getByRole('link', { name: 'Forgot password?' }).click()
      await expect(page).toHaveURL('/reset-password')
    })
  })

  test.describe('Signup Page', () => {
    test('renders signup form with all elements', async ({ page }) => {
      await page.goto('/signup')

      await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
      await expect(page.getByText('Start your learning journey')).toBeVisible()
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
      await expect(page.getByPlaceholder('••••••••')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
      await expect(page.getByText('At least 8 characters')).toBeVisible()
    })

    test('links to login page', async ({ page }) => {
      await page.goto('/signup')
      const loginLink = page.getByRole('link', { name: 'Sign in' })
      await expect(loginLink).toBeVisible()
      await expect(loginLink).toHaveAttribute('href', '/login')
    })

    test('password has minimum length of 8', async ({ page }) => {
      await page.goto('/signup')
      const passwordInput = page.getByPlaceholder('••••••••')
      await expect(passwordInput).toHaveAttribute('minLength', '8')
    })

    test('password visibility toggle works', async ({ page }) => {
      await page.goto('/signup')

      const passwordInput = page.getByPlaceholder('••••••••')
      const toggleButton = page.getByRole('button', { name: 'Show password' })

      await expect(passwordInput).toHaveAttribute('type', 'password')
      await toggleButton.click()
      await expect(passwordInput).toHaveAttribute('type', 'text')
    })

    test('shows error on existing email', async ({ page }) => {
      await page.goto('/signup')

      // Mock Supabase signup to return empty identities (existing user)
      await page.route('**/auth/v1/signup', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'fake-user-id',
            user: { identities: [] },
            session: null,
          }),
        })
      })

      await page.getByPlaceholder('you@example.com').fill('existing@example.com')
      await page.getByPlaceholder('••••••••').fill('password123')
      await page.getByRole('button', { name: 'Create Account' }).click()

      await expect(page.getByText('Email already registered')).toBeVisible({ timeout: 10000 })
    })

    test('shows email confirmation message when no session', async ({ page }) => {
      await page.goto('/signup')

      await page.route('**/auth/v1/signup', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'fake-user-id',
            user: { identities: [{ id: 'identity-1' }] },
            session: null,
          }),
        })
      })

      await page.getByPlaceholder('you@example.com').fill('new@example.com')
      await page.getByPlaceholder('••••••••').fill('password123')
      await page.getByRole('button', { name: 'Create Account' }).click()

      await expect(page.getByText('Check your email to confirm your account')).toBeVisible({ timeout: 10000 })
    })

    test('navigates to login page via link', async ({ page }) => {
      await page.goto('/signup')
      await page.getByRole('link', { name: 'Sign in' }).click()
      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('Reset Password Page', () => {
    test('renders reset password form', async ({ page }) => {
      await page.goto('/reset-password')

      await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible()
      await expect(page.getByText('Enter your email and we\'ll send you a reset link')).toBeVisible()
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
    })

    test('shows success state after submitting email', async ({ page }) => {
      await page.goto('/reset-password')

      await page.route('**/auth/v1/recover**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      })

      await page.getByPlaceholder('you@example.com').fill('test@example.com')
      await page.getByRole('button', { name: 'Send reset link' }).click()

      await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('test@example.com')).toBeVisible()
    })

    test('links to login page', async ({ page }) => {
      await page.goto('/reset-password')
      const loginLink = page.getByRole('link', { name: 'Log in' })
      await expect(loginLink).toBeVisible()
      await expect(loginLink).toHaveAttribute('href', '/login')
    })

    test('shows error when reset fails', async ({ page }) => {
      await page.goto('/reset-password')

      await page.route('**/auth/v1/recover**', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Email not found', error_description: 'Email not found' }),
        })
      })

      await page.getByPlaceholder('you@example.com').fill('nonexistent@example.com')
      await page.getByRole('button', { name: 'Send reset link' }).click()

      await expect(page.getByText(/Email not found/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Update Password Page', () => {
    test('renders update password form', async ({ page }) => {
      await page.goto('/update-password')

      await expect(page.getByRole('heading', { name: 'New password' })).toBeVisible()
      await expect(page.getByText('Enter your new password below')).toBeVisible()
      await expect(page.getByPlaceholder('••••••••')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Update password' })).toBeVisible()
    })

    test('shows success state after password update', async ({ page }) => {
      await page.goto('/update-password')

      await page.route('**/auth/v1/user', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'user-id', email: 'test@example.com' }),
          })
        } else {
          await route.continue()
        }
      })

      await page.getByPlaceholder('••••••••').fill('newpassword123')
      await page.getByRole('button', { name: 'Update password' }).click()

      await expect(page.getByText('Password updated')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Redirecting you to the dashboard...')).toBeVisible()
    })

    test('password has minimum length of 6', async ({ page }) => {
      await page.goto('/update-password')
      const passwordInput = page.getByPlaceholder('••••••••')
      await expect(passwordInput).toHaveAttribute('minLength', '6')
    })

    test('password visibility toggle works', async ({ page }) => {
      await page.goto('/update-password')
      const passwordInput = page.getByPlaceholder('••••••••')
      const toggleButton = page.getByRole('button', { name: 'Show password' })

      await expect(passwordInput).toHaveAttribute('type', 'password')
      await toggleButton.click()
      await expect(passwordInput).toHaveAttribute('type', 'text')
    })

    test('links to login page', async ({ page }) => {
      await page.goto('/update-password')
      const loginLink = page.getByRole('link', { name: 'Back to login' })
      await expect(loginLink).toBeVisible()
      await expect(loginLink).toHaveAttribute('href', '/login')
    })
  })
})
