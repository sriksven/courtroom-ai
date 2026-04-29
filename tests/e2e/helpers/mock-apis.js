/** Intercept Groq-backed routes so CI and local Playwright runs do not require API keys. */
export async function setupMockApis(page) {
  await page.route('**/api/prosecutor', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        content:
          'The prosecution alleges outrageous conduct worthy of mock cross-examination. Three sentences exactly as required.',
      }),
    })
  })

  await page.route('**/api/judge', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        guilty: false,
        verdict_statement: 'Mock verdict: the defense has persuaded the bench in testing.',
        scores: { strength: 7, evidence: 6, logic: 8, persuasion: 7 },
        fallacies: [],
      }),
    })
  })

  await page.route('**/api/defense-hint', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ hints: ['Mock hint: cite the pigeon precedent.'] }),
    })
  })

  await page.route('**/api/tts', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: Buffer.from([]),
    })
  })

  await page.route('**/api/livekit-token', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'mock_unavailable' }),
    })
  })
}
