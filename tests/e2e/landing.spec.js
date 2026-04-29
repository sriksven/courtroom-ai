import { test, expect } from '@playwright/test'

test.describe('Landing', () => {
  test('hero and primary UX copy render', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('All Rise')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Defend Yourself.' })).toBeVisible()
    await expect(
      page.getByText(/courtroom of questionable justice/i),
    ).toBeVisible()
  })

  test('scroll to cases reveals charge grid', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Select Your Charge/ }).click()
    await expect(page.getByText('Choose a charge')).toBeVisible()
    await expect(page.getByRole('button', { name: 'The Monday Heist' })).toBeVisible()
  })

  test('theme toggle switches data-theme', async ({ page }) => {
    await page.goto('/')
    const toggle = page.locator('.theme-toggle')
    await expect(toggle).toBeVisible()

    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light')

    await toggle.click()

    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark')

    await toggle.click()
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light')
  })

  test('selecting a case enables entering the courtroom', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'The Monday Heist' }).click()
    const start = page.getByRole('button', { name: 'Enter the Courtroom →' })
    await expect(start).toBeEnabled()
  })
})
