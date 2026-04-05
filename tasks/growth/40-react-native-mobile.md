# Task 40: React Native / Mobile Support

## Goal
Ship a React Native version of the swarming component for mobile apps. Mobile support doubles the addressable market and enables entirely new use cases (monitoring dashboards on phones/tablets).

## Context
Mobile is where people actually spend time. A React Native version means swarming visualizations can appear in iOS/Android apps. This is also a differentiator — no competing graph library has quality mobile support.

## Requirements

### 1. Package
```bash
npm install @swarming/react-native
```

### 2. Usage
```tsx
import { Swarming } from '@swarming/react-native'

export default function MonitoringScreen() {
  return (
    <Swarming
      source="wss://my-data-stream"
      theme="midnight"
      style={{ flex: 1 }}
    />
  )
}
```

### 3. Rendering Strategy
- Use **react-native-webgpu** or **expo-gl** for GPU rendering
- Alternative: use a WebView with the web version (simpler, lower performance)
- Touch gestures: pinch-to-zoom, drag-to-pan, tap-to-select

### 4. Mobile-Specific Features
- **Haptic feedback**: Vibrate on node selection
- **Gesture controls**: Pinch, rotate, swipe
- **Orientation**: Works in portrait and landscape
- **Performance**: Target 30fps on mid-range phones (limited GPU)
- **Battery-aware**: Reduce FPS when battery is low
- **Offline**: Show last cached visualization when disconnected

### 5. Expo Support
```tsx
// Works in Expo managed workflow
import { Swarming } from '@swarming/expo'
```

### 6. Mobile Demo App
Build a demo app that showcases all features:
- Landing screen with template picker
- Live blockchain visualization
- Settings screen (theme, performance, data source)
- Share button (screenshot + link)
- Publish to TestFlight / Google Play Beta

## Files to Create
```
packages/react-native/
├── src/
│   ├── index.ts
│   ├── Swarming.tsx          # RN component wrapper
│   ├── GLRenderer.tsx        # expo-gl / react-native-webgpu bridge
│   ├── GestureHandler.tsx    # Touch gesture management
│   └── WebViewFallback.tsx   # WebView-based fallback
├── package.json
└── README.md

apps/mobile-demo/
├── app/                      # Expo Router app
├── package.json
└── app.json
```
