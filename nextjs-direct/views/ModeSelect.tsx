'use client'

import { DrivingServiceMode } from '@spatialwalk/avatarkit'

interface Props {
  onSelect: (mode: DrivingServiceMode) => void
}

export default function ModeSelect({ onSelect }: Props) {
  return (
    <div className="mode-select">
      <div className="mode-header">
        <h1>AvatarKit Playground</h1>
        <p>Choose how you want to drive the avatar</p>
      </div>
      <div className="mode-cards">
        <div
          className="mode-card"
          onClick={() => onSelect(DrivingServiceMode.sdk)}
        >
          <div className="mode-icon">🎙️</div>
          <h2>SDK Mode</h2>
          <p className="mode-desc">
            Send audio to the server, SDK handles animation generation and
            playback automatically.
          </p>
          <span className="mode-usecase">Real-time conversation</span>
        </div>
        <div
          className="mode-card"
          onClick={() => onSelect(DrivingServiceMode.host)}
        >
          <div className="mode-icon">🎬</div>
          <h2>Host Mode</h2>
          <p className="mode-desc">
            You provide both audio and animation data. SDK only handles
            synchronized playback.
          </p>
          <span className="mode-usecase">Pre-recorded content</span>
        </div>
      </div>
    </div>
  )
}
