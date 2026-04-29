import OpenAI from 'openai'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { text, voice = 'onyx' } = req.body

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    return res.status(200).send(buffer)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
