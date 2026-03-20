import { DrivingServiceMode } from '@spatialwalk/avatarkit'
import { createModeSelect } from './views/modeSelect'
import { createConfiguration, type AppConfig } from './views/configuration'
import { createPlayground } from './views/playground'

export function createApp(root: HTMLElement) {
  let step: 1 | 2 | 3 = 1
  let mode: DrivingServiceMode | null = null
  let config: AppConfig | null = null

  const app = document.createElement('div')
  app.className = 'app'
  root.appendChild(app)

  const views: HTMLElement[] = []

  function render() {
    app.innerHTML = ''
    views.length = 0

    // View 1: Mode Select
    const v1Wrap = document.createElement('div')
    v1Wrap.className = `view ${step === 1 ? 'active' : ''}`
    v1Wrap.appendChild(createModeSelect((m) => {
      mode = m
      step = 2
      render()
    }))
    views.push(v1Wrap)
    app.appendChild(v1Wrap)

    // View 2: Configuration
    const v2Wrap = document.createElement('div')
    v2Wrap.className = `view ${step === 2 ? 'active' : ''}`
    if (mode) {
      v2Wrap.appendChild(createConfiguration(
        mode,
        (c) => { config = c; step = 3; render() },
        () => { step = 1; render() },
      ))
    }
    views.push(v2Wrap)
    app.appendChild(v2Wrap)

    // View 3: Playground
    const v3Wrap = document.createElement('div')
    v3Wrap.className = `view ${step === 3 ? 'active' : ''}`
    if (mode && config && step === 3) {
      v3Wrap.appendChild(createPlayground(mode, config))
    }
    views.push(v3Wrap)
    app.appendChild(v3Wrap)
  }

  render()
}
