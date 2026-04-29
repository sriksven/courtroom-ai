import 'dotenv/config'
// Also load .env.local (Vite convention)
import { config } from 'dotenv'
config({ path: '.env.local', override: true })
import express from 'express'
import { createRequire } from 'module'

const app = express()
app.use(express.json())

// Dynamically load and wrap each API handler
async function loadHandler(path) {
  const mod = await import(path)
  return mod.default
}

// Shim Vercel req/res to Express req/res (they're compatible)
function wrap(handlerPromise) {
  return async (req, res) => {
    const handler = await handlerPromise
    return handler(req, res)
  }
}

app.all('/api/prosecutor', wrap(loadHandler('./api/prosecutor.js')))
app.all('/api/judge', wrap(loadHandler('./api/judge.js')))
app.all('/api/defense-hint', wrap(loadHandler('./api/defense-hint.js')))
app.all('/api/tts', wrap(loadHandler('./api/tts.js')))
app.all('/api/livekit-token', wrap(loadHandler('./api/livekit-token.js')))

const PORT = 3001
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`))
