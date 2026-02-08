/**
 * Avatar SDK Hook
 * Encapsulates SDK initialization and usage logic
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { AvatarSDK, AvatarManager, AvatarView, Environment, DrivingServiceMode, type AvatarController, type ConnectionState, type ConversationState } from '@spatialwalk/avatarkit'

export function useAvatarSDK() {
  const [isConnected, setIsConnected] = useState(false)
  const [avatarView, setAvatarView] = useState<AvatarView | null>(null)
  const [avatarController, setAvatarController] = useState<AvatarController | null>(null)
  const avatarManagerRef = useRef<AvatarManager | null>(null)
  const avatarViewRef = useRef<AvatarView | null>(null)

  // 获取 AvatarManager（延迟初始化）
  const getAvatarManager = () => {
    if (!avatarManagerRef.current && AvatarSDK.isInitialized) {
      avatarManagerRef.current = AvatarManager.shared
    }
    return avatarManagerRef.current
  }

  // Initialize SDK
  const initialize = async (appId: string, environment: Environment, drivingServiceMode: DrivingServiceMode = DrivingServiceMode.sdk, sessionToken?: string) => {
    try {
      if (!appId.trim()) {
        throw new Error('App ID is required')
      }
      await AvatarSDK.initialize(appId, {
        environment,
        drivingServiceMode
      })

      if (sessionToken) {
        AvatarSDK.setSessionToken(sessionToken)
      }

      avatarManagerRef.current = AvatarManager.shared
    } catch (error) {
      throw new Error(`SDK initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Load avatar
  const loadAvatar = async (
    avatarId: string,
    container: HTMLElement,
    callbacks?: {
      onConnectionState?: (state: ConnectionState) => void
      onConversationState?: (state: ConversationState) => void
      onError?: (error: Error) => void
    },
  ) => {
    const avatarManager = getAvatarManager()
    if (!avatarManager) {
      throw new Error('SDK not initialized')
    }

    try {
      const avatar = await avatarManager.load(avatarId)

      if (!container || !(container instanceof HTMLElement)) {
        throw new Error(`Invalid container: expected HTMLElement, got ${typeof container}`)
      }

      const avatarView = new AvatarView(avatar, container)

      setIsConnected(false)
      avatarView.controller.onConnectionState = (state: ConnectionState) => {
        setIsConnected(state === 'connected')
        callbacks?.onConnectionState?.(state)
      }
      if (callbacks?.onConversationState) {
        avatarView.controller.onConversationState = callbacks.onConversationState
      }
      if (callbacks?.onError) {
        avatarView.controller.onError = callbacks.onError
      }

      setAvatarView(avatarView)
      avatarViewRef.current = avatarView
      setAvatarController(avatarView.controller)
    } catch (error) {
      throw new Error(`Failed to load avatar: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Initialize audio context (MUST be called in user gesture context)
  const initializeAudioContext = useCallback(async () => {
    if (!avatarView?.controller) {
      throw new Error('Avatar not loaded')
    }

    const controller = avatarView.controller as any
    if (typeof controller.initializeAudioContext !== 'function') {
      throw new Error('initializeAudioContext() is not available')
    }

    await controller.initializeAudioContext()
  }, [avatarView])

  // Connect service (network mode only)
  const connect = useCallback(async () => {
    if (!avatarView?.controller) {
      throw new Error('Avatar not loaded')
    }

    await initializeAudioContext()
    await avatarView.controller.start()
  }, [avatarView, initializeAudioContext])

  // Send audio data (network mode only)
  const sendAudio = useCallback((audioData: ArrayBuffer, isFinal: boolean = false) => {
    if (!avatarController) {
      throw new Error('Avatar not loaded or not connected')
    }
    if (!avatarController.send) {
      throw new Error('send() is only available in network mode')
    }
    avatarController.send(audioData, isFinal)
  }, [avatarController])

  // Yield audio data (external data mode)
  const yieldAudioData = (data: Uint8Array, isLast: boolean = false): string | null => {
    if (!avatarController) {
      throw new Error('Avatar not loaded')
    }
    if (!avatarController.yieldAudioData) {
      throw new Error('yieldAudioData() is only available in host mode')
    }
    return avatarController.yieldAudioData(data, isLast)
  }

  // Yield frames data (external data mode)
  const yieldFramesData = (keyframes: any[], conversationId: string | null) => {
    if (!avatarController) {
      throw new Error('Avatar not loaded')
    }
    if (!avatarController.yieldFramesData) {
      throw new Error('yieldFramesData() is only available in host mode')
    }
    if (!conversationId) {
      throw new Error('conversationId is required for yieldFramesData()')
    }
    avatarController.yieldFramesData(keyframes, conversationId)
  }

  // Interrupt conversation
  const interrupt = useCallback(() => {
    if (!avatarController) {
      throw new Error('Avatar not loaded or not connected')
    }
    avatarController.interrupt()
  }, [avatarController])

  // Pause playback
  const pause = useCallback(() => {
    if (!avatarController) {
      throw new Error('Avatar not loaded')
    }
    avatarController.pause()
  }, [avatarController])

  // Resume playback
  const resume = useCallback(async () => {
    if (!avatarController) {
      throw new Error('Avatar not loaded')
    }
    await avatarController.resume()
  }, [avatarController])

  // Disconnect (network mode only)
  const disconnect = useCallback(async () => {
    if (avatarView?.controller) {
      avatarView.controller.close()
      setIsConnected(false)
    }
  }, [avatarView])

  // Set audio volume
  const setVolume = useCallback((volume: number) => {
    if (!avatarController) {
      throw new Error('Avatar not loaded')
    }
    if (typeof volume !== 'number' || volume < 0 || volume > 1) {
      throw new Error('Volume must be a number between 0.0 and 1.0')
    }
    avatarController.setVolume(volume)
  }, [avatarController])

  // Get current audio volume
  const getVolume = useCallback((): number => {
    if (!avatarController) {
      throw new Error('Avatar not loaded')
    }
    return avatarController.getVolume()
  }, [avatarController])

  // Unload avatar
  const unloadAvatar = useCallback(() => {
    if (avatarView) {
      avatarView.dispose()
      setAvatarView(null)
      avatarViewRef.current = null
      setAvatarController(null)
      setIsConnected(false)
    }
  }, [avatarView])

  // Cleanup resources on unmount
  useEffect(() => {
    return () => {
      if (avatarViewRef.current) {
        avatarViewRef.current.dispose()
      }
      if (avatarManagerRef.current) {
        avatarManagerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    isConnected,
    avatarView,
    avatarController,
    initialize,
    loadAvatar,
    connect,
    initializeAudioContext,
    sendAudio,
    yieldAudioData,
    yieldFramesData,
    interrupt,
    pause,
    resume,
    disconnect,
    unloadAvatar,
    setVolume,
    getVolume,
  }
}
