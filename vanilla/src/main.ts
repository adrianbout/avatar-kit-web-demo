import {
  AvatarSDK,
  AvatarManager,
  AvatarView,
  DrivingServiceMode,
  Environment,
  LogLevel,
} from '@spatialwalk/avatarkit'
import './style.css'

const APP_ID       = import.meta.env.VITE_APP_ID as string
const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN as string
const ENVIRONMENT  = (import.meta.env.VITE_ENVIRONMENT ?? 'intl') as Environment
const CHARACTER_ID = import.meta.env.VITE_CHARACTER_ID as string
const WS_URL       = import.meta.env.VITE_WS_URL as string

const CHUNK_SIZE        = 32000
const CHUNK_INTERVAL_MS = 80

function wavToPcm(wav: ArrayBuffer): ArrayBuffer {
  const view = new DataView(wav)
  let offset = 12
  while (offset < view.byteLength - 8) {
    const id = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3),
    )
    const size = view.getUint32(offset + 4, true)
    if (id === 'data') return wav.slice(offset + 8)
    offset += 8 + size
  }
  return wav.slice(44) // fallback
}

function streamPcm(
  pcm: ArrayBuffer,
  send: (chunk: ArrayBuffer, isLast: boolean) => void,
  onDone: () => void,
): () => void {
  const bytes = new Uint8Array(pcm)
  let offset = 0
  let cancelled = false

  const next = () => {
    if (cancelled) return
    if (offset >= bytes.length) {
      send(new ArrayBuffer(0), true)
      onDone()
      return
    }
    const end = Math.min(offset + CHUNK_SIZE, bytes.length)
    send(bytes.slice(offset, end).buffer as ArrayBuffer, false)
    offset = end
    setTimeout(next, CHUNK_INTERVAL_MS)
  }

  next()
  return () => { cancelled = true }
}

async function init() {
  const dot = document.getElementById('status-dot')!

  await AvatarSDK.initialize(APP_ID, {
    environment: ENVIRONMENT,
    drivingServiceMode: DrivingServiceMode.sdk,
    audioFormat: { channelCount: 1, sampleRate: 16000 },
    logLevel: LogLevel.all,
  })
  AvatarSDK.setSessionToken(SESSION_TOKEN)

  const container = document.getElementById('avatar-container')!
  const avatar = await AvatarManager.shared.load(CHARACTER_ID)
  const view = new AvatarView(avatar, container)
  const ctrl = view.controller

  // AudioContext requires a user gesture — init on first click
  let audioReady = false
  document.addEventListener('click', async () => {
    if (audioReady) return
    audioReady = true
    await (ctrl as any).initializeAudioContext()
    await ctrl.start()
  }, { once: true })

  ctrl.onConnectionState = (state) => {
    dot.dataset.state = state
  }

  // Connect to display WebSocket (audio-only broadcast from server)
  const ws = new WebSocket(WS_URL)
  ws.binaryType = 'arraybuffer'

  let cancelStream: (() => void) | null = null

  ws.onmessage = (event) => {
    if (!(event.data instanceof ArrayBuffer)) return

    // Cancel any in-progress stream
    if (cancelStream) { cancelStream(); cancelStream = null }

    const pcm = wavToPcm(event.data)
    cancelStream = streamPcm(
      pcm,
      (chunk, isLast) => ctrl.send(chunk, isLast),
      () => { cancelStream = null },
    )
  }

  ws.onclose = () => { dot.dataset.state = 'disconnected' }
  ws.onerror = () => { dot.dataset.state = 'error' }
}

init().catch(console.error)
