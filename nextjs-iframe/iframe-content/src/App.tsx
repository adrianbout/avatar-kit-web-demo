import { useState, useCallback } from 'react'
import { DrivingServiceMode, Environment } from '@spatialwalk/avatarkit'
import ModeSelect from './views/ModeSelect'
import Configuration from './views/Configuration'
import Playground from './views/Playground'
import './App.css'

export interface AppConfig {
  appId: string
  sessionToken: string
  environment: Environment
}

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mode, setMode] = useState<DrivingServiceMode | null>(null)
  const [config, setConfig] = useState<AppConfig | null>(null)

  const handleModeSelect = useCallback((m: DrivingServiceMode) => {
    setMode(m)
    setStep(2)
  }, [])

  const handleInitialized = useCallback((c: AppConfig) => {
    setConfig(c)
    setStep(3)
  }, [])

  const handleBack = useCallback((toStep: 1 | 2) => {
    setStep(toStep)
  }, [])

  return (
    <div className="app">
      <div className={`view ${step === 1 ? 'active' : ''}`}>
        <ModeSelect onSelect={handleModeSelect} />
      </div>
      <div className={`view ${step === 2 ? 'active' : ''}`}>
        {mode && (
          <Configuration
            mode={mode}
            onInitialized={handleInitialized}
            onBack={() => handleBack(1)}
          />
        )}
      </div>
      <div className={`view ${step === 3 ? 'active' : ''}`}>
        {mode && config && step === 3 && (
          <Playground mode={mode} config={config} />
        )}
      </div>
    </div>
  )
}
