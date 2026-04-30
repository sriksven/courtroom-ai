import { test, expect } from '@playwright/test'

const CASE_BUTTON_NAMES = [
  /Unsolicited Life Advice/,
  /The Spotify Incident/,
  /Aggressive Meal Prepping/,
  /Wifi Password Withholding/,
  /Phantom Typing/,
  /The Reply All Massacre/,
]

async function waitForDefenseInput(page) {
  const opening = page.getByPlaceholder('Type your defense here...')
  const closing = page.getByPlaceholder('Deliver your closing argument...')
  await expect(opening.or(closing)).toBeVisible({ timeout: 120_000 })
  await expect(opening.or(closing)).toBeEnabled({ timeout: 120_000 })
}

async function submitOpeningOrCross(page, text) {
  await waitForDefenseInput(page)
  await page.getByPlaceholder('Type your defense here...').fill(text)
  await page.getByRole('button', { name: 'Submit Defense' }).click()
}

async function submitClosing(page, text) {
  const closing = page.getByPlaceholder('Deliver your closing argument...')
  await expect(closing).toBeVisible({ timeout: 120_000 })
  await expect(closing).toBeEnabled({ timeout: 120_000 })
  await closing.fill(text)
  await page.getByRole('button', { name: 'Closing Argument' }).click()
}

test.describe('six full trials with defense responses', () => {
  test('run six cases through opening, single cross, closing, verdict', async ({ page }) => {
    for (let i = 0; i < CASE_BUTTON_NAMES.length; i++) {
      await page.goto('/')
      await page.getByRole('button', { name: CASE_BUTTON_NAMES[i] }).click()
      await page.getByRole('button', { name: '1' }).click()
      await page.getByRole('button', { name: 'Enter the Courtroom' }).click()
      await expect(page.getByRole('button', { name: 'Summoning the court...' })).toBeVisible({
        timeout: 5_000,
      }).catch(() => {})

      await submitOpeningOrCross(
        page,
        `Simulation ${i + 1} opening reply: I deny the charge categorically and ask the court for fairness.`
      )

      await submitOpeningOrCross(
        page,
        `Simulation ${i + 1} cross-examination: ${i % 2 === 0 ? 'The record shows I acted in good faith.' : 'There is no credible evidence against me.'}`
      )

      await submitClosing(
        page,
        `Simulation ${i + 1} closing: I respectfully ask the court to find in my favor. Justice demands it.`
      )

      await expect(page.getByRole('heading', { name: /Guilty\.|Not Guilty\./ })).toBeVisible({
        timeout: 120_000,
      })
      await page.getByRole('button', { name: 'New Case' }).click()
    }
  })
})
