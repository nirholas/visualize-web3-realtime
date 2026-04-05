# Task 27: Collaborative / Multiplayer Mode

## Goal
Add real-time collaborative viewing where multiple users see the same visualization with shared cursors. This is a viral growth mechanic — people share links, recipients become users.

## Context
"Come look at this" is the most powerful growth loop. If Alice can send Bob a link and they both see the same live visualization with cursors, Bob is going to star the repo. Figma proved that multiplayer makes everything more viral.

## Requirements

### 1. Usage
```tsx
<Swarming
  source="wss://..."
  collaboration={{
    room: "my-session-123",
    server: "wss://swarming.dev/collab", // or self-hosted
    username: "alice",
    color: "#ff6b6b",
  }}
/>
```

### 2. Shared State
- All users see the same node positions (physics state synced)
- Cursor positions visible as colored dots with usernames
- Camera positions optionally synced ("follow mode")
- Node selections shared (highlight what others are looking at)

### 3. Collaboration Features
- **Shared cursors**: See other users' cursor positions in 3D space
- **Follow mode**: Click a user's avatar to follow their camera
- **Annotations**: Click a node to place a pin/comment visible to all
- **Presenter mode**: One user controls the camera, others follow
- **Room link**: Shareable URL that drops you into the session

### 4. Architecture
- Use **Yjs** or **PartyKit** for CRDT-based state synchronization
- WebSocket relay server (can be self-hosted or use swarming.dev hosted)
- Minimal bandwidth: only sync deltas (cursor position, camera changes, annotations)
- Physics runs on one client ("host"), positions broadcast to others

### 5. Free Hosted Server
- `wss://swarming.dev/collab` — free hosted relay for up to 10 concurrent users per room
- Self-hosting docs for unlimited usage
- This free tier is a growth mechanic (people use it, share links, new users discover swarming)

### 6. Share URL Format
```
https://swarming.dev/view?room=abc123&source=wss://...
```
Or for the npm package:
```tsx
// Generate a share link
const { shareUrl } = useSwarming()
console.log(shareUrl) // "https://swarming.dev/view?room=auto-generated-id"
```

## Files to Create
```
packages/swarming/src/collaboration/
├── CollaborationProvider.tsx  # React context for collab state
├── CursorOverlay.tsx          # Render other users' cursors
├── SyncEngine.ts              # Yjs/PartyKit sync logic
├── PresenterMode.ts           # Camera follow mode
└── types.ts

packages/swarming-collab-server/
├── src/
│   ├── index.ts              # WebSocket relay server
│   └── room.ts               # Room management
├── Dockerfile                # For self-hosting
└── package.json
```
