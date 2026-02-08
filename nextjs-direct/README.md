# Next.js Direct Integration Example

This is an AvatarKit SDK example using Next.js App Router with direct SDK integration (no iframe), demonstrating how to integrate the SDK in a Next.js application with automatic WASM configuration.

## 💡 Why Direct Integration?

Unlike the [iframe approach](../nextjs-iframe/), this example integrates the SDK directly into the Next.js application using the `withAvatarkit` Next.js plugin, which automatically handles all WASM/webpack compatibility issues:

- **Zero configuration** - Just wrap your Next.js config with `withAvatarkit()`
- **No iframe overhead** - SDK runs directly in the Next.js app
- **Full control** - Direct access to SDK APIs without postMessage
- **Single deployment** - No separate iframe content to manage

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Navigate to nextjs-direct example directory
cd nextjs-direct

# Install dependencies
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access Example

Open browser and visit: `http://localhost:5177`

### Production Build

```bash
npm run build
npm run start
```

## 🔧 WASM Configuration

The SDK provides a built-in Next.js plugin that handles all WASM-related webpack configuration automatically:

```js
// next.config.mjs
import { withAvatarkit } from '@spatialwalk/avatarkit/next'

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withAvatarkit(nextConfig)
```

The plugin automatically handles:
1. **webpack `asset/inline` fix** - Moves `generator.asset.filename` to `asset/resource` only
2. **Emscripten `scriptDirectory` fix** - Replaces build-time `file://` path with correct public URL
3. **WASM file copying** - Copies `.wasm` files to `/_next/static/chunks/`
4. **MIME type headers** - Ensures `.wasm` files are served with `application/wasm`

## 📋 Features

- SDK initialization
- Avatar loading (with progress display)
- WebSocket connection management
- Real-time audio recording and sending
- Real-time animation rendering
- Conversation interruption (supports interruption in both network and external data modes)
- Audio volume control (0-100% slider)
- Log panel (real-time status display)
- SDK Mode: Real-time audio streaming via WebSocket
- Host Mode: Pre-recorded audio and animation playback (requires server-side SDK for keyframe generation)

## 🎯 Use Cases

- Next.js projects that need direct SDK integration
- Projects requiring full control over SDK APIs
- Single-deployment architectures
- Server-side rendering compatible setups

## 🔧 Tech Stack

- **Next.js 14** - React framework (App Router)
- **React 18** - UI framework
- **React Hooks** - State management
- **TypeScript** - Type safety

## 🔑 Configuration

### Environment Configuration

- **`intl`** - International production environment (default)
- **`cn`** - China production environment
- **`test`** - Test environment

### Session Token (Required)

**All environments now require a Session Token for authentication.**

**Quick Setup:**
1. Click the **"Auto"** button next to the "Session Token" input field
2. The button will generate a temporary token valid for 1 hour
3. The token will be automatically filled into the input field
4. **Important**: Generate the token **before** initializing the SDK, so it will be automatically set during initialization
5. If SDK is already initialized, the token will be set immediately when generated

**Manual Entry:**
- You can also manually enter a Session Token if you have one
- The token must be valid and not expired

### Avatar ID

Get avatar ID from SDK management platform.

## 📁 Project Structure

```
nextjs-direct/
├── app/                       # Next.js App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Main page (client component)
│   └── globals.css           # Global styles
├── components/                # UI components
│   ├── AvatarPanel.tsx       # Core avatar panel (SDK lifecycle)
│   ├── AvatarCanvas.tsx      # Canvas container with FPS/volume
│   ├── ControlPanel.tsx      # Control buttons and forms
│   ├── StatusBar.tsx         # Status display
│   └── LogPanel.tsx          # Log output
├── hooks/                     # Custom React Hooks
│   ├── useAvatarSDK.ts       # SDK management Hook
│   ├── useAudioRecorder.ts   # Audio recording Hook
│   └── useLogger.ts          # Logger Hook
├── utils/                     # Utility functions
│   └── audioUtils.ts         # Audio processing utilities
├── types/                     # Type definitions
│   └── index.ts              # Type definitions
├── next.config.mjs           # Next.js config with withAvatarkit()
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## ⚠️ Notes

- Requires browser support for Web Audio API, WebSocket, and WASM
- Requires user authorization for microphone permission
- Ensure `@spatialwalk/avatarkit` SDK is installed: `npm install @spatialwalk/avatarkit`
- Resources are automatically cleaned up on component unmount, no manual management needed
- **Host Mode**: Requires the Avatar digital human server-side SDK to generate animation keyframes from audio. The example uses pre-generated data files for demonstration. In production, you must integrate with the server-side SDK.

## 🔗 Related Documentation

- See the main [README.md](../README.md) for general SDK usage
- See [nextjs-iframe](../nextjs-iframe/) for iframe-based integration approach
- See [react](../react/) for Vite-based React integration
