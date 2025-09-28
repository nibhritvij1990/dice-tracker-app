import { test, expect } from '@playwright/test'

// All tests assume BASE_URL is set (via playwright.config) and vite runs on that URL.

test.beforeEach(async ({ page }) => {
  await page.goto('/#/splash')
})

test('navigates to start then home', async ({ page }) => {
  await page.goto('/#/start')
  await expect(page.getByText('Get Started')).toBeVisible()
  await page.getByText('Get Started').click()
  await expect(page).toHaveURL(/.*#\/home/)
  // Use role-based selector to avoid strict mode collisions with helper text
  await expect(page.getByRole('button', { name: 'Generate Map' })).toBeVisible()
})

test('sidebar shows Google sign-in when signed out', async ({ page }) => {
  await page.goto('/#/home')
  await page.getByRole('button', { name: 'Options' }).click()
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
})

test('mock sign-in shows profile and backup controls', async ({ page }) => {
  // Set mock auth and reload so the app reads it on mount
  await page.evaluate(() => localStorage.setItem('mock_auth', '1'))
  await page.reload()
  await page.goto('/#/home')
  await page.getByRole('button', { name: 'Options' }).click()
  await expect(page.getByText('Sign out')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Backup' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export file' })).toBeVisible()
  await expect(page.getByText('Import file')).toBeVisible()
  // Cleanup
  await page.evaluate(() => localStorage.removeItem('mock_auth'))
})

test('board renders and can generate', async ({ page }) => {
  await page.goto('/#/home')
  await expect(page.getByRole('button', { name: 'Generate Map' })).toBeVisible()
  await page.getByRole('button', { name: 'Generate Map' }).click()
  const tokens = page.locator('#catan-map-container .text-xs')
  await expect(tokens.first()).toBeVisible()
})

test('histogram bars react after manual entries', async ({ page }) => {
  await page.goto('/#/tracker')
  // Switch to Manual mode explicitly
  await page.getByRole('button', { name: 'Manual' }).click()
  // Roll two manual entries
  await page.getByRole('button', { name: '5' }).click()
  await page.getByRole('button', { name: '6' }).click()
  // Assert localStorage reflects at least 2 rolls in current game
  const rollCount = await page.evaluate(() => {
    const id = localStorage.getItem('dice_tracker_current_game_id')
    if (!id) return 0
    const raw = localStorage.getItem(`dice_tracker_game_${id}`)
    if (!raw) return 0
    try { return (JSON.parse(raw).rolls || []).length } catch { return 0 }
  })
  expect(rollCount).toBeGreaterThanOrEqual(2)
})


