# OpenCode Anywhere

A mobile-friendly PWA client for [OpenCode](https://github.com/sst/opencode) - control your AI coding assistant from anywhere.

Similar to Happy Coder for Claude Code, but for OpenCode.

## Features

- **PWA Support**: Install on iOS/Android home screen for native-like experience
- **Real-time Updates**: SSE-based live streaming of assistant responses
- **Session Management**: Create, switch, and manage multiple coding sessions
- **Permission Handling**: Approve/deny tool executions remotely
- **Push Notifications**: Get notified when assistant needs your attention
- **Dark Mode**: Easy on the eyes, optimized for mobile

## Quick Start

### 1. Start OpenCode Server

On your development machine:

```bash
# Start OpenCode with HTTP server enabled
opencode serve --hostname 0.0.0.0 --port 4096
```

### 2. Connect CLI to the Server (Important!)

If you want to see messages from Anywhere in your CLI (and vice versa), use the `attach` command to connect to the same server:

```bash
# In a separate terminal, attach CLI to the running server
opencode attach http://localhost:4096
```

> **Note**: Running `opencode` without `attach` starts a separate internal server. The CLI and Anywhere would share the same storage files but won't sync in real-time. Using `attach` ensures both clients connect to the same server and receive real-time SSE updates.

### 3. Run the Client

```bash
cd opencode-anywhere
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone (same network).

### 4. Connect

Enter your OpenCode server URL (e.g., `http://192.168.1.100:4096`) and connect.

## Remote Access (Optional)

For access outside your local network, use the included relay server:

### Option A: Relay Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your OpenCode server details
npm start
```

The relay server proxies requests to your OpenCode instance, enabling access from anywhere.

### Option B: Cloudflare Tunnel (Recommended)

```bash
# Install cloudflared
brew install cloudflared

# Create tunnel to OpenCode
cloudflared tunnel --url http://localhost:4096
```

This gives you a public HTTPS URL without exposing your network.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile PWA    │────▶│  Next.js API    │────▶│ OpenCode Server │
│   (Browser)     │◀────│    Routes       │◀────│   (Port 4096)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │ SSE Events            │ Proxy
        ▼                       ▼
   Real-time UI          /api/opencode/*
```

- **PWA Client**: React UI with Zustand state management
- **API Routes**: Proxy layer (SDK has Node.js dependencies)
- **SSE**: Server-Sent Events for real-time updates

## Project Structure

```
src/
├── app/
│   ├── api/opencode/      # API proxy routes
│   │   ├── health/        # Connection check
│   │   ├── sessions/      # Session CRUD + messages
│   │   └── ...
│   ├── page.tsx           # Main app (Connect/Chat views)
│   └── layout.tsx         # PWA meta tags
├── components/
│   ├── ConnectionForm.tsx # Server URL input
│   ├── SessionList.tsx    # Session sidebar
│   ├── MessageList.tsx    # Chat messages
│   ├── MessageInput.tsx   # Message composer
│   └── PermissionDialog.tsx # Permission modal
├── hooks/
│   ├── useSSE.ts          # Real-time event subscription
│   └── usePWA.ts          # Install prompt handling
├── lib/
│   └── opencode.ts        # HTTP client for OpenCode API
├── store/
│   └── index.ts           # Zustand store (persisted)
└── types/
    └── index.ts           # TypeScript definitions

public/
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker
└── icon.svg               # App icon

server/                    # Optional relay server
├── index.js               # Express proxy
└── .env.example           # Configuration
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## PWA Installation

### iOS
1. Open in Safari
2. Tap Share button
3. "Add to Home Screen"

### Android
1. Open in Chrome
2. Tap "Install" prompt (or menu → "Install app")

## Configuration

### Environment Variables

The Next.js app doesn't require env vars - server URL is configured in the UI.

For the relay server (`server/.env`):

```env
PORT=3001
OPENCODE_URL=http://localhost:4096
# Optional: AUTH_TOKEN=your-secret-token
```

## Troubleshooting

### "Failed to connect"
- Ensure OpenCode is running: `opencode serve --hostname 0.0.0.0 --port 4096`
- Check firewall allows port 4096
- Verify URL includes protocol: `http://` not just IP

### SSE not working
- Some corporate proxies block SSE
- Try the relay server or Cloudflare tunnel

### PWA not installing
- Must be served over HTTPS (or localhost)
- Check browser supports PWA (Safari iOS 11.3+, Chrome Android)

## License

MIT

## Credits

Built for use with [OpenCode](https://github.com/sst/opencode) by SST.
