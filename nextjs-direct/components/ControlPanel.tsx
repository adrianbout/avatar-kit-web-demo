'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { DrivingServiceMode, type AvatarController } from '@spatialwalk/avatarkit'
import type { AvatarInstance } from '@/hooks/useAvatarSDK'
import { PCM_ASSETS } from '@/data/audioAssets'
import { loadPcmFile, sendPcmChunks } from '@/utils/audio'

interface AvatarSlot {
  uid: string
  index: number
  name: string
}

interface Props {
  mode: DrivingServiceMode
  activeAvatar: AvatarInstance | null
  activeController: AvatarController | null
  multiMode?: boolean
  avatarSlots?: AvatarSlot[]
  activeUid?: string | null
  onSlotSelect?: (uid: string) => void
}

export default function ControlPanel({ mode, activeAvatar, activeController, multiMode, avatarSlots, activeUid, onSlotSelect }: Props) {
  const [sending, setSending] = useState(false)
  const [hostLoading, setHostLoading] = useState(false)
  const cancelRef = useRef<(() => void) | null>(null)
  const isSDK = mode === DrivingServiceMode.sdk
  const connected = activeAvatar?.connectionState === 'connected'
  const hasAvatar = activeAvatar?.view !== null && !activeAvatar?.loading

  const handleStart = useCallback(async () => {
    if (!activeController) return
    try {
      await (activeController as any).initializeAudioContext()
      await activeController.start()
    } catch (e: any) {
      console.error('Start failed:', e)
    }
  }, [activeController])

  const handleSendPcm = useCallback(async (path: string) => {
    if (!activeController || sending) return
    setSending(true)
    try {
      await (activeController as any).initializeAudioContext()
      const data = await loadPcmFile(path)
      cancelRef.current = sendPcmChunks(
        data,
        (chunk, end) => activeController.send(chunk.buffer as ArrayBuffer, end),
        () => setSending(false),
      )
    } catch (e: any) {
      console.error('Send failed:', e)
      setSending(false)
    }
  }, [activeController, sending])

  const handleHostDemo = useCallback(async () => {
    if (!activeController || hostLoading) return
    setHostLoading(true)
    try {
      await (activeController as any).initializeAudioContext()
      const res = await fetch('/audio/host_demo.json')
      const json = await res.json()
      const audioBytes = Uint8Array.from(atob(json.audio_base64), c => c.charCodeAt(0))
      const animFrames = (json.animation_messages_base64 as string[]).map((b64: string) =>
        Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      )
      const convId = (activeController as any).yieldAudioData(audioBytes, true)
      ;(activeController as any).yieldFramesData(animFrames, convId)
    } catch (e: any) {
      console.error('Host demo failed:', e)
    } finally {
      setHostLoading(false)
    }
  }, [activeController, hostLoading])

  const handlePause = () => activeController?.pause()
  const handleResume = () => activeController?.resume()
  const handleInterrupt = () => {
    activeController?.interrupt()
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setSending(false)
  }

  // Cancel ongoing audio send when disconnected
  useEffect(() => {
    if (!connected && cancelRef.current) {
      cancelRef.current()
      cancelRef.current = null
      setSending(false)
    }
  }, [connected])

  return (
    <div className="control-panel">
      <h3>Controls</h3>

      {activeAvatar && (
        <div className="status-bar">
          <div className="status-row">
            <span className="status-label">Connection</span>
            <span className={`status-value ${activeAvatar.connectionState}`}>
              {activeAvatar.connectionState}
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Conversation</span>
            <span className="status-value">{activeAvatar.conversationState}</span>
          </div>
          {activeAvatar.error && (
            <div className="status-row error">
              <span className="status-label">Error</span>
              <span className="status-value error-text">{activeAvatar.error}</span>
            </div>
          )}
        </div>
      )}

      {multiMode && avatarSlots && avatarSlots.length > 0 && (
        <div className="slot-selector">
          <h4>Active Avatar</h4>
          <div className="slot-list">
            {avatarSlots.map(s => (
              <button
                key={s.uid}
                className={`slot-btn ${s.uid === activeUid ? 'active' : ''}`}
                onClick={() => onSlotSelect?.(s.uid)}
              >
                <span className="slot-index">{s.index}</span>
                <span className="slot-name">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!hasAvatar && (
        <p className="panel-hint">Load a character first</p>
      )}

      {isSDK && hasAvatar && (
        <>
          <button className="primary full-width" disabled={connected || !hasAvatar} onClick={handleStart}>
            {connected ? 'Connected' : 'Start'}
          </button>
          <div className="audio-list">
            <h4>Audio Files</h4>
            {PCM_ASSETS.map(a => (
              <button key={a.path} className="secondary full-width audio-btn" disabled={!connected || sending} onClick={() => handleSendPcm(a.path)}>
                {sending ? '...' : `▶ ${a.name}`}
              </button>
            ))}
          </div>
        </>
      )}

      {!isSDK && hasAvatar && (
        <>
          <button className="primary full-width" disabled={hostLoading || !hasAvatar} onClick={handleHostDemo}>
            {hostLoading ? 'Loading...' : '▶ Play Demo'}
          </button>
          <p className="host-hint">
            This demo uses pre-recorded data. For real-time interaction, integrate with the{' '}
            <a href="https://docs.spatialreal.ai/guide/host-mode" target="_blank" rel="noreferrer">Server SDK</a>.
          </p>
        </>
      )}

      {hasAvatar && (
        <div className="btn-row">
          <button className="secondary" onClick={handlePause}>Pause</button>
          <button className="secondary" onClick={handleResume}>Resume</button>
          <button className="danger" onClick={handleInterrupt}>Interrupt</button>
        </div>
      )}
    </div>
  )
}