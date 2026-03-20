<script setup lang="ts">
import { ref } from 'vue'
import { DrivingServiceMode, Environment } from '@spatialwalk/avatarkit'
import ModeSelect from './views/ModeSelect.vue'
import Configuration from './views/Configuration.vue'
import Playground from './views/Playground.vue'
import './App.css'

export interface AppConfig {
  appId: string
  sessionToken: string
  environment: Environment
}

const step = ref<1 | 2 | 3>(1)
const mode = ref<DrivingServiceMode | null>(null)
const config = ref<AppConfig | null>(null)

function handleModeSelect(m: DrivingServiceMode) {
  mode.value = m
  step.value = 2
}

function handleInitialized(c: AppConfig) {
  config.value = c
  step.value = 3
}

function handleBack(toStep: 1 | 2) {
  step.value = toStep
}
</script>

<template>
  <div class="app">
    <div :class="['view', { active: step === 1 }]">
      <ModeSelect @select="handleModeSelect" />
    </div>
    <div :class="['view', { active: step === 2 }]">
      <Configuration
        v-if="mode"
        :mode="mode"
        @initialized="handleInitialized"
        @back="handleBack(1)"
      />
    </div>
    <div :class="['view', { active: step === 3 }]">
      <Playground
        v-if="mode && config && step === 3"
        :mode="mode"
        :config="config"
      />
    </div>
  </div>
</template>
