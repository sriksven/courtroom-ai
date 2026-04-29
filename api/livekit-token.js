import { AccessToken } from 'livekit-server-sdk'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    return res.status(503).json({ error: 'LiveKit not configured' })
  }

  try {
    const { roomName, participantName, canPublish = false } = req.body

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: '1h',
    })

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: canPublish, // true for Flow 2 (audio), false for Flow 1 (data only)
      canPublishData: true,   // always — needed for data messages in both flows
      canSubscribe: true,
    })

    const jwt = await token.toJwt()
    return res.status(200).json({ token: jwt, url: process.env.LIVEKIT_URL })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
