'use client'

/**
 * 单个角色面板组件
 * 每个面板独立管理自己的 SDK 状态和按钮
 */

import { useState, useRef, useEffect } from 'react'
import { useAvatarSDK } from '@/hooks/useAvatarSDK'
import { AvatarSDK, DrivingServiceMode, ConversationState } from '@spatialwalk/avatarkit'
import { useLogger } from '@/hooks/useLogger'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { StatusBar } from './StatusBar'
import { ControlPanel } from './ControlPanel'
import { AvatarCanvas } from './AvatarCanvas'
import { LogPanel } from './LogPanel'
import { resampleAudioWithWebAudioAPI, convertToInt16PCM, convertToUint8Array, decodeAudioFile } from '@/utils/audioUtils'

interface AvatarPanelProps {
  panelId: string
  globalSDKInitialized: boolean
  onRemove?: () => void
  getSampleRate?: () => number
}

export function AvatarPanel({ panelId, globalSDKInitialized, onRemove, getSampleRate }: AvatarPanelProps) {
  const [avatarIdList, setAvatarIdList] = useState<string[]>([])
  const [avatarId, setAvatarId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [volume, setVolume] = useState(100)
  const [conversationState, setConversationState] = useState<ConversationState | null>(null)

  const [isProcessing, setIsProcessing] = useState({
    loadAvatar: false, connect: false, startRecord: false, stopRecord: false,
    interrupt: false, disconnect: false, unload: false, loadAudio: false,
  })

  const [showLoadAudioModal, setShowLoadAudioModal] = useState(false)
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null)
  const [isSendingAudio, setIsSendingAudio] = useState(false)

  const logger = useLogger()
  const audioRecorder = useAudioRecorder()
  const sdk = useAvatarSDK()

  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false)
  const [isTransformModalOpen, setIsTransformModalOpen] = useState(false)
  const [transformX, setTransformX] = useState('0')
  const [transformY, setTransformY] = useState('0')
  const [transformScale, setTransformScale] = useState('1')

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const shouldContinueSendingDataRef = useRef(false)

  useEffect(() => {
    if (globalSDKInitialized) {
      logger.updateStatus('SDK initialized, ready to load avatar', 'success')
    } else {
      logger.updateStatus('Waiting for initialization...', 'info')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSDKInitialized])

  const handleLoadAvatar = async () => {
    if (isProcessing.loadAvatar || sdk.avatarView) return
    if (!globalSDKInitialized || !avatarId.trim()) {
      logger.updateStatus('Please wait for SDK initialization and enter avatar ID', 'warning')
      return
    }
    if (!canvasContainerRef.current) {
      logger.updateStatus('Canvas container not found', 'error')
      return
    }

    try {
      setIsProcessing(prev => ({ ...prev, loadAvatar: true }))
      setIsLoading(true)
      const currentMode = AvatarSDK.configuration?.drivingServiceMode || DrivingServiceMode.sdk
      const modeName = currentMode === DrivingServiceMode.sdk ? 'SDK mode (network)' : 'Host mode (external data)'
      logger.updateStatus(`Loading avatar (${modeName})...`, 'info')
      logger.log('info', `Starting to load avatar: ${avatarId} (mode: ${modeName})`)

      await sdk.loadAvatar(avatarId, canvasContainerRef.current, {
        onConnectionState: (state: string) => {
          logger.log('info', `Connection state: ${state}`)
          if (state === 'connected') logger.updateStatus('Connected', 'success')
          else if (state === 'disconnected') logger.updateStatus('Disconnected', 'info')
        },
        onConversationState: (state: ConversationState) => {
          setConversationState(state)
          logger.log('info', `Conversation state: ${state}`)
          if (state === ConversationState.playing) setIsSendingAudio(false)
        },
        onError: (error: Error) => {
          logger.log('error', `Error: ${error.message}`)
          logger.updateStatus(`Error: ${error.message}`, 'error')
        },
      })

      try {
        const currentVolume = sdk.getVolume()
        setVolume(Math.round(currentVolume * 100))
      } catch {}

      logger.updateStatus('Avatar loaded successfully', 'success')
      logger.log('success', 'Avatar loaded successfully')
      requestAnimationFrame(() => setIsLoading(false))
    } catch (error) {
      logger.updateStatus(`Load failed: ${error instanceof Error ? error.message : String(error)}`, 'error')
      logger.log('error', `Load failed: ${error instanceof Error ? error.message : String(error)}`)
      setIsLoading(false)
    } finally {
      setIsProcessing(prev => ({ ...prev, loadAvatar: false }))
    }
  }

  const handleConnect = async () => {
    if (isProcessing.connect) return
    const currentMode = AvatarSDK.configuration?.drivingServiceMode || DrivingServiceMode.sdk
    if (currentMode !== DrivingServiceMode.sdk) {
      logger.updateStatus('Connect is only available in SDK mode', 'warning')
      return
    }
    if (!sdk.avatarView) { logger.updateStatus('Please load avatar first', 'warning'); return }
    if (sdk.isConnected) { logger.updateStatus('Already connected', 'warning'); return }

    try {
      setIsProcessing(prev => ({ ...prev, connect: true }))
      setIsLoading(true)
      logger.updateStatus('Connecting to service...', 'info')
      logger.log('info', 'Connecting to service...')
      await sdk.connect()
      logger.updateStatus('Connected successfully', 'success')
      logger.log('success', 'Connected successfully')
    } catch (error) {
      logger.updateStatus(`Connection failed: ${error instanceof Error ? error.message : String(error)}`, 'error')
      logger.log('error', `Connection failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
      setIsProcessing(prev => ({ ...prev, connect: false }))
    }
  }

  const handleLoadAudio = () => {
    const currentMode = AvatarSDK.configuration?.drivingServiceMode || DrivingServiceMode.sdk
    if (currentMode !== DrivingServiceMode.sdk) { logger.updateStatus('Load audio is only available in SDK mode', 'warning'); return }
    if (!sdk.isConnected) { logger.updateStatus('Please connect to service first', 'warning'); return }
    if (!sdk.avatarView) { logger.updateStatus('Please load avatar first', 'warning'); return }
    setShowLoadAudioModal(true)
    setSelectedAudioFile(null)
  }

  const handleConfirmLoadAudio = async () => {
    if (!selectedAudioFile) { logger.updateStatus('Please select an audio file', 'warning'); return }
    if (!sdk.isConnected || !sdk.avatarView) return

    try {
      setIsProcessing(prev => ({ ...prev, loadAudio: true }))
      logger.log('info', `Loading audio file: ${selectedAudioFile.name} (${(selectedAudioFile.size / 1024).toFixed(2)} KB)`)
      logger.updateStatus('Loading audio file...', 'info')

      const arrayBuffer = await selectedAudioFile.arrayBuffer()
      const targetSampleRate = getSampleRate ? getSampleRate() : 16000
      const fileName = selectedAudioFile.name.toLowerCase()
      const isAudioFile = fileName.endsWith('.mp3') || fileName.endsWith('.wav') || selectedAudioFile.type.startsWith('audio/')

      let audioData: ArrayBuffer
      if (isAudioFile) {
        logger.log('info', 'Decoding audio file...')
        const decoded = await decodeAudioFile(arrayBuffer, targetSampleRate)
        audioData = decoded.data.buffer as ArrayBuffer
        logger.log('info', `Audio file decoded: ${audioData.byteLength} bytes (${decoded.duration.toFixed(2)}s)`)
      } else {
        audioData = arrayBuffer
      }

      if (sdk.avatarController) {
        setIsSendingAudio(true)
        sdk.sendAudio(audioData, true)
        logger.log('success', 'Audio file sent to avatar')
        logger.updateStatus('Audio file sent', 'success')
        setShowLoadAudioModal(false)
        setSelectedAudioFile(null)
      }
    } catch (error) {
      logger.log('error', `Failed to load audio file: ${error instanceof Error ? error.message : String(error)}`)
      logger.updateStatus(`Failed to load audio: ${error instanceof Error ? error.message : String(error)}`, 'error')
    } finally {
      setIsProcessing(prev => ({ ...prev, loadAudio: false }))
    }
  }

  const handleStartRecord = async () => {
    if (isProcessing.startRecord || audioRecorder.isRecording) return
    const currentMode = AvatarSDK.configuration?.drivingServiceMode || DrivingServiceMode.sdk
    if (currentMode === DrivingServiceMode.sdk && !sdk.isConnected) {
      logger.updateStatus('Please connect to service first', 'warning'); return
    }
    if (!sdk.avatarView) { logger.updateStatus('Please load avatar first', 'warning'); return }

    try {
      setIsProcessing(prev => ({ ...prev, startRecord: true }))
      const sampleRate = getSampleRate ? getSampleRate() : 16000
      await audioRecorder.start(sampleRate)
      logger.updateStatus(`Recording... (${sampleRate} Hz)`, 'success')
      logger.log('success', `Recording started (${sampleRate} Hz)`)
    } catch (error) {
      logger.updateStatus(`Recording failed: ${error instanceof Error ? error.message : String(error)}`, 'error')
      logger.log('error', `Recording failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessing(prev => ({ ...prev, startRecord: false }))
    }
  }

  const handleStopRecord = async () => {
    if (isProcessing.stopRecord) return
    const currentMode = AvatarSDK.configuration?.drivingServiceMode || DrivingServiceMode.sdk

    if (currentMode === DrivingServiceMode.sdk && !audioRecorder.isRecording) {
      logger.updateStatus('Not recording', 'warning'); return
    }

    try {
      setIsProcessing(prev => ({ ...prev, stopRecord: true }))

      if (currentMode === DrivingServiceMode.sdk) {
        const audioBuffer = await audioRecorder.stop()
        if (audioBuffer && sdk.avatarController) {
          const sampleRate = getSampleRate ? getSampleRate() : 16000
          const duration = (audioBuffer.byteLength / 2 / sampleRate).toFixed(2)
          logger.log('info', `Recording completed, total length: ${audioBuffer.byteLength} bytes (${duration}s)`)
          setIsSendingAudio(true)
          sdk.sendAudio(audioBuffer, true)
          logger.log('success', 'Complete audio data sent')
        }
        logger.updateStatus('Recording stopped', 'info')
      } else {
        await handleExternalDataMode()
      }
    } catch (error) {
      logger.log('error', `Operation failed: ${error instanceof Error ? error.message : String(error)}`)
      logger.updateStatus(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error')
    } finally {
      setIsProcessing(prev => ({ ...prev, stopRecord: false }))
    }
  }

  const handleExternalDataMode = async () => {
    try {
      logger.log('info', 'Fetching data from API...')
      logger.updateStatus('Fetching data from API...', 'info')

      const response = await fetch('https://server-sdk-mock-demo.spatialwalk.cn/media')
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()
      if (!data.audio || !data.animations) throw new Error('Invalid data format')

      const base64ToUint8Array = (base64: string): Uint8Array => {
        const binaryString = atob(base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
        return bytes
      }

      const rawAudioData = base64ToUint8Array(data.audio)
      const animationsData = data.animations.map((anim: string) => base64ToUint8Array(anim))

      const targetSampleRate = getSampleRate ? getSampleRate() : 16000
      const sourceSampleRate = 24000

      let audioData = rawAudioData
      if (targetSampleRate !== sourceSampleRate) {
        logger.log('info', `Resampling audio from ${sourceSampleRate}Hz to ${targetSampleRate}Hz...`)
        const int16Array = new Int16Array(rawAudioData.buffer, rawAudioData.byteOffset, rawAudioData.length / 2)
        const float32Array = new Float32Array(int16Array.length)
        for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768.0
        const resampledFloat32 = await resampleAudioWithWebAudioAPI(float32Array, sourceSampleRate, targetSampleRate)
        const resampledInt16 = convertToInt16PCM(resampledFloat32)
        audioData = convertToUint8Array(resampledInt16)
      }

      logger.updateStatus('Playing data...', 'info')
      await sdk.initializeAudioContext()

      const conversationId = sdk.yieldAudioData(audioData, true)
      if (!conversationId) throw new Error('Failed to get conversation ID')

      sdk.yieldFramesData(animationsData, conversationId)
      logger.log('success', 'Data playback started')
      logger.updateStatus('Data playback started', 'success')
    } catch (error) {
      logger.log('error', `Failed: ${error instanceof Error ? error.message : String(error)}`)
      logger.updateStatus(`Failed: ${error instanceof Error ? error.message : String(error)}`, 'error')
      throw error
    }
  }

  const handlePlayPause = async () => {
    if (!sdk.avatarView) return
    try {
      if (conversationState === 'playing') {
        sdk.pause()
        logger.log('info', 'Playback paused')
      } else if (conversationState === 'pausing' || conversationState === 'idle') {
        await sdk.resume()
        logger.log('info', 'Playback resumed')
      }
    } catch (error) {
      logger.log('error', `Play/Pause failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleInterrupt = () => {
    if (isProcessing.interrupt || !sdk.avatarView) return
    try {
      setIsProcessing(prev => ({ ...prev, interrupt: true }))
      const currentMode = AvatarSDK.configuration?.drivingServiceMode || DrivingServiceMode.sdk
      if (currentMode === DrivingServiceMode.host) shouldContinueSendingDataRef.current = false
      sdk.interrupt()
      logger.updateStatus('Current conversation interrupted', 'info')
      logger.log('info', 'Current conversation interrupted')
    } catch (error) {
      logger.updateStatus(`Interrupt failed: ${error instanceof Error ? error.message : String(error)}`, 'error')
    } finally {
      setIsProcessing(prev => ({ ...prev, interrupt: false }))
    }
  }

  const handleDisconnect = async () => {
    if (isProcessing.disconnect) return
    const currentMode = AvatarSDK.configuration?.drivingServiceMode || DrivingServiceMode.sdk
    if (currentMode !== DrivingServiceMode.sdk) return
    if (!sdk.isConnected) { logger.updateStatus('Not connected', 'warning'); return }

    try {
      setIsProcessing(prev => ({ ...prev, disconnect: true }))
      setIsLoading(true)
      if (audioRecorder.isRecording) await handleStopRecord()
      await sdk.disconnect()
      logger.updateStatus('Disconnected', 'info')
      logger.log('info', 'Disconnected')
    } catch (error) {
      logger.log('error', `Disconnect failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
      setIsProcessing(prev => ({ ...prev, disconnect: false }))
    }
  }

  const handleUnloadAvatar = () => {
    if (isProcessing.unload || !sdk.avatarView) return
    try {
      setIsProcessing(prev => ({ ...prev, unload: true }))
      const currentMode = AvatarSDK.configuration?.drivingServiceMode || DrivingServiceMode.sdk
      if (currentMode === DrivingServiceMode.host) shouldContinueSendingDataRef.current = false
      if (audioRecorder.isRecording) audioRecorder.stop().catch(() => {})
      if (sdk.isConnected) sdk.disconnect().catch(() => {})
      sdk.unloadAvatar()
      setIsLoading(false)
      setConversationState(null)
      logger.updateStatus('Avatar unloaded', 'info')
      logger.log('info', 'Avatar unloaded')
    } catch (error) {
      logger.log('error', `Unload avatar failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessing(prev => ({ ...prev, unload: false }))
    }
  }

  const handleApplyTransform = () => {
    if (!sdk.avatarView) return
    try {
      const x = parseFloat(transformX)
      const y = parseFloat(transformY)
      const scale = parseFloat(transformScale)
      if (isNaN(x) || x < -1 || x > 1) throw new Error('X must be between -1 and 1')
      if (isNaN(y) || y < -1 || y > 1) throw new Error('Y must be between -1 and 1')
      if (isNaN(scale) || scale < 0.1 || scale > 5) throw new Error('Scale must be between 0.1 and 5')
      sdk.avatarView.transform = { x, y, scale }
      logger.log('success', `Transform applied: x=${x}, y=${y}, scale=${scale}`)
      setIsTransformModalOpen(false)
    } catch (error) {
      logger.log('error', `Transform failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  useEffect(() => {
    return () => {
      if (audioRecorder.isRecording) audioRecorder.stop().catch(() => {})
      if (sdk.avatarView) sdk.unloadAvatar()
      audioRecorder.cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="avatar-panel">
      <div className="avatar-panel-header">
        <h3>Avatar Panel {panelId}</h3>
        {onRemove && (
          <button className="btn-remove" onClick={onRemove} title="Remove Panel">×</button>
        )}
      </div>

      <div className="avatar-panel-content">
        <div className="avatar-panel-controls">
          <StatusBar message={logger.statusMessage} type={logger.statusClass} />
          <ControlPanel
            environment={AvatarSDK.configuration?.environment}
            avatarId={avatarId}
            isInitialized={globalSDKInitialized}
            avatarView={sdk.avatarView}
            avatarController={sdk.avatarController}
            isRecording={audioRecorder.isRecording}
            isLoading={isLoading}
            isConnected={sdk.isConnected}
            currentPlaybackMode={(AvatarSDK.configuration?.drivingServiceMode || DrivingServiceMode.sdk) === DrivingServiceMode.sdk ? 'network' : 'external'}
            conversationState={conversationState}
            isSendingAudio={isSendingAudio}
            avatarIdList={avatarIdList}
            onAvatarIdChange={(id) => {
              setAvatarId(id)
              if (id && !avatarIdList.includes(id)) setAvatarIdList([...avatarIdList, id])
            }}
            onLoadAvatar={handleLoadAvatar}
            onConnect={handleConnect}
            onLoadAudio={handleLoadAudio}
            onStartRecord={handleStartRecord}
            onStopRecord={handleStopRecord}
            onInterrupt={handleInterrupt}
            onDisconnect={handleDisconnect}
            onUnloadAvatar={handleUnloadAvatar}
          />
          <button className="btn btn-primary" onClick={() => setIsLogDrawerOpen(!isLogDrawerOpen)} style={{ marginTop: '12px' }}>
            {isLogDrawerOpen ? '📋 Hide Logs' : '📋 Show Logs'}
          </button>
        </div>
        <div className="avatar-panel-canvas">
          <AvatarCanvas
            ref={canvasContainerRef}
            avatarView={sdk.avatarView}
            showTransformButton={!!sdk.avatarView}
            volume={volume}
            onVolumeChange={(v) => {
              setVolume(v)
              try { sdk.setVolume(v / 100) } catch {}
            }}
            showVolumeSlider={!!sdk.avatarView}
            showPlayPauseButton={!!sdk.avatarView}
            playPauseIcon={conversationState === 'playing' ? '⏸️' : '▶️'}
            playPauseTitle={conversationState === 'playing' ? 'Pause' : 'Resume'}
            playPauseDisabled={conversationState === 'idle'}
            onPlayPauseClick={handlePlayPause}
            onTransformClick={() => {
              if (sdk.avatarView?.transform) {
                try {
                  const t = sdk.avatarView.transform
                  setTransformX(String(t.x || 0))
                  setTransformY(String(t.y || 0))
                  setTransformScale(String(t.scale || 1))
                } catch {
                  setTransformX('0'); setTransformY('0'); setTransformScale('1')
                }
              }
              setIsTransformModalOpen(true)
            }}
          />
        </div>
      </div>

      {/* Log Drawer */}
      <div className={`log-drawer ${isLogDrawerOpen ? 'open' : ''}`}>
        <div className="log-drawer-header">
          <h2>📋 Logs</h2>
          <button className="btn-close-drawer" onClick={() => setIsLogDrawerOpen(false)} title="Close">×</button>
        </div>
        <LogPanel logs={logger.logs} onClear={logger.clear} />
      </div>

      {/* Load Audio Modal */}
      {showLoadAudioModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowLoadAudioModal(false); setSelectedAudioFile(null) }}
        >
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', minWidth: '400px', maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Load Audio File</h3>
            <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>Select an audio file (PCM, MP3, or WAV)</p>
            <input type="file" accept=".pcm,.mp3,.wav,audio/*" onChange={e => setSelectedAudioFile(e.target.files?.[0] || null)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowLoadAudioModal(false); setSelectedAudioFile(null) }}
                style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmLoadAudio} disabled={!selectedAudioFile || isProcessing.loadAudio}
                style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: selectedAudioFile ? 'pointer' : 'not-allowed', opacity: selectedAudioFile ? 1 : 0.6 }}>Load</button>
            </div>
          </div>
        </div>
      )}

      {/* Transform Modal */}
      {isTransformModalOpen && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setIsTransformModalOpen(false) }}
        >
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', minWidth: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Transform Settings</h3>
            {[
              { label: 'X Position (-1 to 1)', value: transformX, set: setTransformX, desc: '-1 = left, 0 = center, 1 = right' },
              { label: 'Y Position (-1 to 1)', value: transformY, set: setTransformY, desc: '-1 = bottom, 0 = center, 1 = top' },
              { label: 'Scale Factor', value: transformScale, set: setTransformScale, desc: '1.0 = original, 2.0 = double' },
            ].map(({ label, value, set, desc }) => (
              <div key={label} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{label}</label>
                <input type="number" step="0.1" value={value} onChange={e => set(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  onKeyDown={e => { if (e.key === 'Escape') setIsTransformModalOpen(false); if (e.key === 'Enter') handleApplyTransform() }} />
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>{desc}</p>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsTransformModalOpen(false)} style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleApplyTransform} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
