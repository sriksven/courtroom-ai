import { test, expect } from '@playwright/test'
import { setupMockApis } from './helpers/mock-apis.js'

async function goToTrialWithMocks(page) {
  await setupMockApis(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'The Monday Heist' }).click()
  await page.getByRole('button', { name: 'Enter the Courtroom →' }).click()
  await expect(page.getByText(/alleg(es|ations)? outrageous conduct/i)).toBeVisible({ timeout: 20_000 })
}

async function submitDefenseRound(page, text) {
  const input = page.getByPlaceholder(/Type your defense|Deliver your closing/)
  await expect(input).toBeEnabled({ timeout: 20_000 })
  await input.fill(text)
  const submit = page.getByRole('button', { name: /Submit Defense|Closing Argument/ })
  await submit.click()
}

test.describe('Trial → Verdict flow (mocked APIs)', () => {
  test('full text trial reaches verdict screen', async ({ page }) => {
    await goToTrialWithMocks(page)

    await submitDefenseRound(page, 'Opening defense motion for summary mockery.')
    await expect(page.getByText(/alleg(es|ations)? outrageous conduct/i).first()).toBeVisible()

    await submitDefenseRound(page, 'Cross-examination defense one.')
    await submitDefenseRound(page, 'Cross-examination defense two.')
    await submitDefenseRound(page, 'Cross-examination defense three.')
    await submitDefenseRound(page, 'Closing argument completes the circuit.')

    await expect(page.getByRole('heading', { name: 'Not Guilty.' })).toBeVisible({ timeout: 25_000 })
    await expect(page.getByText(/Mock verdict/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Case →' })).toBeVisible()
  })

  test('back from trial returns to landing', async ({ page }) => {
    await goToTrialWithMocks(page)
    await page.getByRole('button', { name: '←' }).click()
    await expect(page.getByRole('heading', { name: 'Defend Yourself.' })).toBeVisible()
  })

  test('hint control shows mocked counsel text', async ({ page }) => {
    await goToTrialWithMocks(page)

    await page.getByRole('button', { name: /Get a Hint/ }).click()
    await expect(page.getByText(/Mock hint/)).toBeVisible({ timeout: 15_000 })
  })

  test('input footer shows submit shortcut helper', async ({ page }) => {
    await goToTrialWithMocks(page)

    await expect(page.getByText(/⌘↵ to submit/)).toBeVisible()
  })

  test('new case from verdict restores landing', async ({ page }) => {
    await goToTrialWithMocks(page)

    for (let i = 0; i < 5; i++) {
      await submitDefenseRound(page, `Defense round ${i + 1}`)
    }

    await expect(page.getByRole('heading', { name: 'Not Guilty.' })).toBeVisible({ timeout: 25_000 })
    await page.getByRole('button', { name: 'New Case →' }).click()
    await expect(page.getByRole('heading', { name: 'Defend Yourself.' })).toBeVisible()
  })
})
