<script setup lang="ts">
import { DrivingServiceMode } from '@spatialwalk/avatarkit'

const emit = defineEmits<{
  select: [mode: DrivingServiceMode]
}>()
</script>

<template>
  <div class="mode-select">
    <div class="mode-header">
      <h1>AvatarKit Playground</h1>
      <p>Choose how you want to drive the avatar</p>
    </div>
    <div class="mode-cards">
      <div class="mode-card" @click="emit('select', DrivingServiceMode.sdk)">
        <div class="mode-icon">🎙️</div>
        <h2>SDK Mode</h2>
        <p class="mode-desc">
          Send audio to the server, SDK handles animation generation and
          playback automatically.
        </p>
        <span class="mode-usecase">Real-time conversation</span>
      </div>
      <div class="mode-card" @click="emit('select', DrivingServiceMode.host)">
        <div class="mode-icon">🎬</div>
        <h2>Host Mode</h2>
        <p class="mode-desc">
          You provide both audio and animation data. SDK only handles
          synchronized playback.
        </p>
        <span class="mode-usecase">Pre-recorded content</span>
      </div>
    </div>
  </div>
</template>
