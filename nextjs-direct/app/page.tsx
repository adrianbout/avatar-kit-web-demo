'use client'

/**
 * Main application page
 * Next.js direct SDK integration (no iframe)
 */

import { useState, useEffect } from 'react'
import { AvatarPanel } from '@/components/AvatarPanel'
import { AvatarSDK, Environment, DrivingServiceMode } from '@spatialwalk/avatarkit'
import { saveToStorage, loadFromStorage, saveSessionToken, loadSessionToken } from '@/utils/storage'

interface Panel {
  id: string
}

export default function Home() {
  const [panels, setPanels] = useState<Panel[]>([{ id: '1' }])
  const [globalSDKInitialized, setGlobalSDKInitialized] = useState(false)
  const [sdkInitializing, setSdkInitializing] = useState(false)
  const [currentDrivingServiceMode, setCurrentDrivingServiceMode] = useState<DrivingServiceMode | null>(null)
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>(() => loadFromStorage('environment', Environment.intl) as Environment)
  const [selectedSampleRate, setSelectedSampleRate] = useState(() => loadFromStorage('sampleRate', 16000))
  const [appId, setAppId] = useState(() => loadFromStorage('appId', ''))
  const [sessionToken, setSessionToken] = useState(() => loadSessionToken())

  useEffect(() => {
    if (AvatarSDK.isInitialized) {
      setGlobalSDKInitialized(true)
      setCurrentDrivingServiceMode(AvatarSDK.configuration?.drivingServiceMode || DrivingServiceMode.sdk)
    }
  }, [])

  // Persist inputs to localStorage
  useEffect(() => { saveToStorage('appId', appId) }, [appId])
  useEffect(() => { saveSessionToken(sessionToken) }, [sessionToken])
  useEffect(() => { saveToStorage('environment', selectedEnvironment) }, [selectedEnvironment])
  useEffect(() => { saveToStorage('sampleRate', selectedSampleRate) }, [selectedSampleRate])

  const handleInitSDK = async (mode: DrivingServiceMode) => {
    if (AvatarSDK.isInitialized || sdkInitializing) return

    try {
      setSdkInitializing(true)
      if (!appId.trim()) throw new Error('App ID is required')

      await AvatarSDK.initialize(appId, {
        environment: selectedEnvironment,
        drivingServiceMode: mode,
        audioFormat: { channelCount: 1, sampleRate: selectedSampleRate }
      } as any)

      if (sessionToken.trim()) {
        AvatarSDK.setSessionToken(sessionToken.trim())
      }

      setCurrentDrivingServiceMode(mode)
      setGlobalSDKInitialized(true)
    } catch (error: any) {
      console.error('Failed to initialize SDK:', error)
      alert(`Failed to initialize SDK: ${error?.message || 'Unknown error'}`)
    } finally {
      setSdkInitializing(false)
    }
  }

  const handleAddPanel = () => {
    const newId = String(panels.length + 1)
    setPanels([...panels, { id: newId }])
  }

  const handleRemovePanel = (panelId: string) => {
    if (panels.length <= 1) return
    setPanels(panels.filter(p => p.id !== panelId))
  }

  const injectToken = () => {
    if (!sessionToken.trim()) { alert('Please enter a session token'); return }
    if (!AvatarSDK.isInitialized) { alert('SDK not initialized yet'); return }
    try {
      AvatarSDK.setSessionToken(sessionToken.trim())
      alert('Session token injected successfully')
    } catch (error: any) {
      alert(`Failed to inject token: ${error.message}`)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🚀 Avatar SDK - Next.js Direct Example</h1>
        <p>Direct SDK integration without iframe (using copy-webpack-plugin for WASM)</p>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative' }}>
          <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#1f2937', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', maxWidth: '800px', textAlign: 'center', fontWeight: 600, fontSize: '15px', lineHeight: 1.5, marginBottom: '8px' }}>
            📋 <strong>Get your App ID and Session Token from the</strong>{' '}
            <a href="https://dash.spatialreal.ai" target="_blank" rel="noopener noreferrer"
              style={{ color: '#1e40af', textDecoration: 'underline', fontWeight: 700, margin: '0 4px' }}>
              Developer Platform
            </a>
            {' '}<strong>to initialize the SDK</strong>
          </div>
          {!globalSDKInitialized && !sdkInitializing && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' }}>
                <span className="arrow-pointing-right" style={{ color: '#ff0000', fontSize: '48px', fontWeight: 'bold', lineHeight: '1', flexShrink: 0 }}>→</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <label style={{ color: 'white', fontSize: '14px', whiteSpace: 'nowrap' }}>Environment:</label>
                  <select value={selectedEnvironment} onChange={(e) => setSelectedEnvironment(e.target.value as Environment)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', fontSize: '14px', background: 'white', color: '#333', cursor: 'pointer', flexShrink: 0 }}>
                    <option value={Environment.intl}>International</option>
                    <option value={Environment.cn}>CN</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <label style={{ color: 'white', fontSize: '14px', whiteSpace: 'nowrap' }}>Sample Rate:</label>
                  <select value={selectedSampleRate} onChange={(e) => setSelectedSampleRate(parseInt(e.target.value, 10))}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', fontSize: '14px', background: 'white', color: '#333', cursor: 'pointer', flexShrink: 0 }}
                    disabled={globalSDKInitialized}>
                    <option value={8000}>8000 Hz</option>
                    <option value={16000}>16000 Hz</option>
                    <option value={22050}>22050 Hz</option>
                    <option value={24000}>24000 Hz</option>
                    <option value={32000}>32000 Hz</option>
                    <option value={44100}>44100 Hz</option>
                    <option value={48000}>48000 Hz</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <label style={{ color: 'white', fontSize: '14px', whiteSpace: 'nowrap' }}>App ID:</label>
                  <input type="text" value={appId} onChange={(e) => setAppId(e.target.value)}
                    placeholder="App ID" disabled={globalSDKInitialized}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', fontSize: '14px', background: 'white', color: '#333', minWidth: '300px', flexShrink: 0 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => handleInitSDK(DrivingServiceMode.sdk)} className="btn-init-sdk">
                  🔧 Initialize SDK (SDK Mode)
                </button>
                <button onClick={() => handleInitSDK(DrivingServiceMode.host)} className="btn-init-sdk">
                  🔧 Initialize SDK (Host Mode)
                </button>
              </div>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
            <label style={{ color: 'white', fontSize: '14px', whiteSpace: 'nowrap' }}>Session Token:</label>
            <input type="text" value={sessionToken} onChange={(e) => setSessionToken(e.target.value)}
              placeholder="Session Token"
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', background: 'white', color: '#333', minWidth: '300px', flexShrink: 0, cursor: 'text' }} />
            <button onClick={injectToken} title="Inject token to SDK"
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', fontSize: '14px', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: 500 }}>
              Inject
            </button>
          </div>
          {sdkInitializing && <p style={{ color: '#ffeb3b', margin: 0 }}>⏳ Initializing SDK...</p>}
          {globalSDKInitialized && currentDrivingServiceMode && (
            <p style={{ color: '#10b981', margin: 0 }}>
              ✅ SDK initialized ({currentDrivingServiceMode === DrivingServiceMode.sdk ? 'SDK Mode' : 'Host Mode'}, {selectedEnvironment === Environment.cn ? 'CN' : 'International'})
            </p>
          )}
          {panels.length < 4 && (
            <button className="btn-add-panel-header" onClick={handleAddPanel}>+ Add Avatar Panel</button>
          )}
        </div>
      </div>

      <div className="content">
        <div className="panels-container">
          {panels.map(panel => (
            <AvatarPanel
              key={panel.id}
              panelId={panel.id}
              globalSDKInitialized={globalSDKInitialized}
              onRemove={panels.length > 1 ? () => handleRemovePanel(panel.id) : undefined}
              getSampleRate={() => selectedSampleRate}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
