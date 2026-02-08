/**
 * Audio Recording Hook
 * Implemented using ScriptProcessorNode
 */

import { useState, useRef, useEffect } from 'react'
import { mergeAudioChunks, resampleAudio, convertToInt16PCM, convertToUint8Array } from '@/utils/audioUtils'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Array<{ data: Float32Array }>>([])
  const actualSampleRateRef = useRef(16000)
  const targetSampleRateRef = useRef(16000)
  const isRecordingFlagRef = useRef(false)

  const start = async (sampleRate: number = 16000) => {
    targetSampleRateRef.current = sampleRate
    try {
      if (isRecordingFlagRef.current) {
        await stop()
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      audioChunksRef.current = []

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: targetSampleRateRef.current,
      })
      audioContextRef.current = audioContext
      actualSampleRateRef.current = audioContext.sampleRate

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: targetSampleRateRef.current,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      })

      mediaStreamRef.current = stream

      const bufferSize = 4096
      const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)
      scriptProcessorRef.current = scriptProcessor

      const gainNode = audioContext.createGain()
      gainNode.gain.value = 0

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(scriptProcessor)
      scriptProcessor.connect(gainNode)
      gainNode.connect(audioContext.destination)

      isRecordingFlagRef.current = true

      scriptProcessor.onaudioprocess = (event) => {
        if (!isRecordingFlagRef.current) return

        const inputData = event.inputBuffer.getChannelData(0)
        audioChunksRef.current.push({
          data: new Float32Array(inputData),
        })
      }

      setIsRecording(true)
    } catch (error) {
      isRecordingFlagRef.current = false
      setIsRecording(false)
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const stop = async (): Promise<ArrayBuffer | null> => {
    try {
      isRecordingFlagRef.current = false
      setIsRecording(false)

      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect()
        scriptProcessorRef.current = null
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }

      const currentSampleRate = actualSampleRateRef.current

      if (audioContextRef.current) {
        try {
          const state = audioContextRef.current.state as string
          if (state !== 'closed' && state !== 'closing') {
            await audioContextRef.current.close()
          }
        } catch (err) {
          // Silently handle close errors
        } finally {
          audioContextRef.current = null
        }
      }

      if (audioChunksRef.current.length === 0) {
        return null
      }

      const mergedFloat32 = mergeAudioChunks(audioChunksRef.current)

      let finalAudio = mergedFloat32
      if (currentSampleRate !== targetSampleRateRef.current) {
        finalAudio = resampleAudio(mergedFloat32, currentSampleRate, targetSampleRateRef.current)
      }

      const pcm16 = convertToInt16PCM(finalAudio)
      const mergedAudio = convertToUint8Array(pcm16)

      audioChunksRef.current = []

      return mergedAudio.buffer as ArrayBuffer
    } catch (error) {
      throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const cleanup = () => {
    if (isRecordingFlagRef.current) {
      stop().catch(() => {})
    }
  }

  useEffect(() => {
    return () => {
      if (isRecordingFlagRef.current) {
        isRecordingFlagRef.current = false
        if (scriptProcessorRef.current) {
          scriptProcessorRef.current.disconnect()
          scriptProcessorRef.current = null
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop())
          mediaStreamRef.current = null
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {})
          audioContextRef.current = null
        }
      }
    }
  }, [])

  return {
    isRecording,
    start,
    stop,
    cleanup,
  }
}
