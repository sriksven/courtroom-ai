# Voice Modes

## Overview

All Rise has three interaction modes. You pick between Text and Auto Voice on the landing page before entering the trial. You can also switch mid-trial using the 🎙 button in the charge header.

| Mode | Key | How You Interact | AI Voice | Infrastructure |
|---|---|---|---|---|
| Text | `'off'` | Type (or mic → textarea) | Manual play buttons | Browser only |
| Auto Voice | `'hybrid'` | Speak aloud | Automatic TTS + mic loop | Browser + OpenAI TTS |
| Live Voice | `'full'` | Speak aloud | Automatic via WebRTC | LiveKit WebRTC + server agent |

---

## Mode 1: Text

The default. `TrialInputBar` renders at the bottom.

### Typing
- Standard textarea with `⌘↵` submit shortcut
- Submit button disabled until text is non-empty and trial is not loading

### Mic Button (STT → textarea)
The 🎙 button uses `useVoice` with `interimResults: true`. As you speak, words appear in the textarea live:

```js
recognition.onresult = (event) => {
  let interim = ''
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const t = event.results[i][0].transcript
    if (event.results[i].isFinal) finalTranscript += t
    else interim += t
  }
  const live = finalTranscript + interim
  onTranscript(live)    // → setInputText(live) in TrialInputBar
}
```

When you stop speaking the text stays in the box. You can edit it before submitting. It does not auto-submit.

### Manual TTS
Every chat bubble (prosecutor, defense, judge) has a play/pause/stop button. Only one plays at a time — `useAudioPlayer` manages a single shared `Audio` element. Clicking play on a new bubble stops the current one first.

```
▶  — fetch TTS → play
⏸  — pause
▶  — resume
■  — stop (resets to beginning)
```

---

## Mode 2: Auto Voice (Hybrid)

Selected on landing page with "🎙 Auto Voice". `VoiceStatus` renders at the bottom showing the current state.

This mode runs an infinite `while` loop in `useVoiceMode.js`. The loop uses browser-native Web Speech API for STT and calls `/api/tts` for TTS. No WebRTC, no LiveKit.

### Loop States

```
IDLE       → loop not running
WAITING    → parked, waiting for new AI message
SPEAKING   → TTS audio playing
LISTENING  → SpeechRecognition active, mic is hot
PROCESSING → transcript submitted, waiting for AI response
DONE       → trial ended (verdict received or manual stop)
```

### VoiceStatus Display

| State | Shows |
|---|---|
| WAITING | "Waiting for prosecution…" |
| SPEAKING | Who is speaking (Prosecution / The Court), animated waveform bars |
| LISTENING | "Your turn — speak now", live transcript preview, waveform |
| PROCESSING | "Submitting…" |
| DONE | "Trial concluded" |

### Stopping

The Exit button calls `stop()` which:
1. Sets `abortRef.current = true`
2. Fires any parked `waitForNextMessage` resolver so the loop can exit cleanly
3. Resets all state to IDLE
4. Sets `loopRunningRef.current = false`

After stopping, `voiceModeOn` is set to `'off'` and `TrialInputBar` renders again.

### Why Refs Instead of State in the Loop

The `while` loop is an async function. React state captured in its closure becomes stale after the first render. Solution: refs updated by `useEffect`:

```js
const messagesRef = useRef(messages)
useEffect(() => { messagesRef.current = messages }, [messages])

const phaseRef = useRef(phase)
useEffect(() => { phaseRef.current = phase }, [phase])

const submitRef = useRef(submitDefense)
useEffect(() => { submitRef.current = submitDefense }, [submitDefense])
```

The loop always reads from refs, never from captured state.

### waitForNextMessage

The loop needs to park between AI responses without busy-waiting. A Promise resolver pattern handles this:

```js
function waitForNextMessage() {
  return new Promise((resolve) => {
    const check = () =>
      messagesRef.current.find(
        m => (m.role === 'prosecutor' || m.role === 'judge')
          && !spokenIdsRef.current.has(m.id)
      )

    // If an unspoken message already exists, resolve immediately
    const immediate = check()
    if (immediate) { resolve(immediate); return }

    // Otherwise park: store resolver for useEffect to fire
    newMessageResolverRef.current = () => resolve(check())
  })
}

// This useEffect fires whenever messages changes
useEffect(() => {
  if (newMessageResolverRef.current) {
    newMessageResolverRef.current()    // wake up the parked loop
    newMessageResolverRef.current = null
  }
}, [messages])
```

---

## Mode 3: Live Voice (Full)

Selected by clicking the 🎙 button a second time in the charge header (cycles: off → hybrid → full → off). `MicIndicator` renders at the bottom.

This mode uses LiveKit WebRTC. Your mic audio streams to the server-side voice agent. Everything else — STT, LLM, TTS — happens server-side.

### Session States

```
IDLE           → not connected
CONNECTING     → fetching token, connecting room, publishing mic
AGENT_READY    → agent joined and signaled ready
AGENT_SPEAKING → agent audio streaming to browser
USER_TURN      → agent stopped speaking, awaiting user
USER_SPEAKING  → user's mic active, speech detected
PROCESSING     → agent received audio, running STT + LLM
VERDICT        → trial ended
ERROR          → connection failed
```

### Connection Sequence

```js
startSession():
  1. POST /api/livekit-token → JWT token
  2. new Room({ adaptiveStream: true, dynacast: true })
  3. room.connect(livekitUrl, token)
  4. createLocalAudioTrack({ echoCancellation, noiseSuppression })
  5. room.localParticipant.publishTrack(audioTrack)
  6. wait for { type: 'agent_ready' } data message
  7. send { type: 'trial_state', phase: 'OPENING', accusation, ... }
```

### Speaking Detection

```js
room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
  const agentSpeaking = speakers.some(s => s.identity?.startsWith('agent'))
  const userSpeaking  = speakers.some(s => !s.identity?.startsWith('agent'))
  // → set state accordingly
})
```

### Ending a Session

```js
endSession():
  audioTrack.stop()
  room.disconnect()
  → IDLE
```

---

## TTS Voices

All TTS calls go through `/api/tts` → OpenAI `tts-1-hd`.

| Character | Voice | Quality |
|---|---|---|
| Prosecutor (Reginald) | `onyx` | Deep, authoritative |
| Judge (Constance) | `shimmer` | Clear, formal |
| Defense (you) | `alloy` | Neutral |

### Manual Play (Text Mode)

Each bubble has a `PlayButton` that calls `useAudioPlayer.play(msgId, text, voice)`:

```js
async function play(id, text, voice) {
  stop()                          // stop any currently playing
  setLoadingId(id)
  const res = await fetch('/api/tts', { method: 'POST', body: { text, voice } })
  const blob = await res.blob()
  const audio = new Audio(URL.createObjectURL(blob))
  audioRef.current = audio
  setPlayingId(id)
  audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url) }
  await audio.play()
}
```

Only one audio element exists at a time. Playing a new bubble automatically stops the previous one.

---

## Browser Compatibility

| Feature | Requirement |
|---|---|
| Web Speech API (STT) | Chrome, Edge, Safari (not Firefox) |
| Audio playback (TTS) | All modern browsers |
| LiveKit WebRTC | Chrome, Edge, Firefox, Safari |

The app detects Speech API availability:
```js
const isAvailable = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
```

If unavailable: mic button is hidden, auto-voice mode skips the listen step (loop continues without STT).
