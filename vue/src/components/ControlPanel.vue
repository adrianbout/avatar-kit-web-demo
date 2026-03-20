<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { DrivingServiceMode, type AvatarController } from '@spatialwalk/avatarkit'
import type { AvatarInstance } from '../composables/useAvatarSDK'
import { PCM_ASSETS } from '../data/audioAssets'
import { loadPcmFile, sendPcmChunks } from '../utils/audio'

interface AvatarSlot {
  uid: string
  index: number
  name: string
}

const props = defineProps<{
  mode: DrivingServiceMode
  activeAvatar: AvatarInstance | null
  activeController: AvatarController | null
  multiMode?: boolean
  avatarSlots?: AvatarSlot[]
  activeUid?: string | null
}>()

const emit = defineEmits<{
  slotSelect: [uid: string]
}>()

const sending = ref(false)
const hostLoading = ref(false)
const cancelRef = ref<(() => void) | null>(null)

const isSDK = props.mode === DrivingServiceMode.sdk
const connected = computed(() => props.activeAvatar?.connectionState === 'connected')
const hasAvatar = computed(() => props.activeAvatar?.view !== null && !props.activeAvatar?.loading)
async function handleStart() {
  if (!props.activeController) return
  try {
    await (props.activeController as any).initializeAudioContext()
    await props.activeController.start()
  } catch (e: any) {
    console.error('Start failed:', e)
  }
}

async function handleSendPcm(path: string) {
  if (!props.activeController || sending.value) return
  sending.value = true
  try {
    await (props.activeController as any).initializeAudioContext()
    const data = await loadPcmFile(path)
    cancelRef.value = sendPcmChunks(
      data,
      (chunk, end) => props.activeController!.send(chunk.buffer as ArrayBuffer, end),
      () => { sending.value = false },
    )
  } catch (e: any) {
    console.error('Send failed:', e)
    sending.value = false
  }
}

async function handleHostDemo() {
  if (!props.activeController || hostLoading.value) return
  hostLoading.value = true
  try {
    await (props.activeController as any).initializeAudioContext()
    const res = await fetch('/audio/host_demo.json')
    const json = await res.json()
    const audioBytes = Uint8Array.from(atob(json.audio_base64), c => c.charCodeAt(0))
    const animFrames = (json.animation_messages_base64 as string[]).map((b64: string) =>
      Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    )
    const convId = (props.activeController as any).yieldAudioData(audioBytes, true)
    ;(props.activeController as any).yieldFramesData(animFrames, convId)
  } catch (e: any) {
    console.error('Host demo failed:', e)
  } finally {
    hostLoading.value = false
  }
}

function handlePause() { props.activeController?.pause() }
function handleResume() { props.activeController?.resume() }
function handleInterrupt() {
  props.activeController?.interrupt()
  if (cancelRef.value) { cancelRef.value(); cancelRef.value = null }
  sending.value = false
}

// Cancel ongoing audio send when disconnected
watch(connected, (val) => {
  if (!val && cancelRef.value) {
    cancelRef.value()
    cancelRef.value = null
    sending.value = false
  }
})
</script>

<template>
  <div class="control-panel">
    <h3>Controls</h3>
    <!-- Status -->
    <div v-if="activeAvatar" class="status-bar">
      <div class="status-row">
        <span class="status-label">Connection</span>
        <span :class="['status-value', activeAvatar.connectionState]">
          {{ activeAvatar.connectionState }}
        </span>
      </div>
      <div class="status-row">
        <span class="status-label">Conversation</span>
        <span class="status-value">{{ activeAvatar.conversationState }}</span>
      </div>
      <div v-if="activeAvatar.error" class="status-row error">
        <span class="status-label">Error</span>
        <span class="status-value error-text">{{ activeAvatar.error }}</span>
      </div>
    </div>

    <!-- Slot selector in multi mode -->
    <div v-if="multiMode && avatarSlots && avatarSlots.length > 0" class="slot-selector">
      <h4>Active Avatar</h4>
      <div class="slot-list">
        <button
          v-for="s in avatarSlots"
          :key="s.uid"
          :class="['slot-btn', { active: s.uid === activeUid }]"
          @click="emit('slotSelect', s.uid)"
        >
          <span class="slot-index">{{ s.index }}</span>
          <span class="slot-name">{{ s.name }}</span>
        </button>
      </div>
    </div>

    <p v-if="!hasAvatar" class="panel-hint">Load a character first</p>

    <!-- SDK Mode -->
    <template v-if="isSDK && hasAvatar">
      <button
        class="primary full-width"
        :disabled="connected || !hasAvatar"
        @click="handleStart"
      >
        {{ connected ? 'Connected' : 'Start' }}
      </button>

      <div class="audio-list">
        <h4>Audio Files</h4>
        <button
          v-for="a in PCM_ASSETS"
          :key="a.path"
          class="secondary full-width audio-btn"
          :disabled="!connected || sending"
          @click="handleSendPcm(a.path)"
        >
          {{ sending ? '...' : `▶ ${a.name}` }}
        </button>
      </div>
    </template>

    <!-- Host Mode -->
    <template v-if="!isSDK && hasAvatar">
      <button
        class="primary full-width"
        :disabled="hostLoading || !hasAvatar"
        @click="handleHostDemo"
      >
        {{ hostLoading ? 'Loading...' : '▶ Play Demo' }}
      </button>
      <p class="host-hint">
        This demo uses pre-recorded data. For real-time interaction, integrate with the
        <a href="https://docs.spatialreal.ai/guide/host-mode" target="_blank" rel="noreferrer">Server SDK</a>.
      </p>
    </template>

    <!-- Common controls -->
    <div v-if="hasAvatar" class="btn-row">
      <button class="secondary" @click="handlePause">Pause</button>
      <button class="secondary" @click="handleResume">Resume</button>
      <button class="danger" @click="handleInterrupt">Interrupt</button>
    </div>
  </div>
</template>
