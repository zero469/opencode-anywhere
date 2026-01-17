# OpenCode Anywhere

A mobile-friendly PWA client for [OpenCode](https://github.com/sst/opencode) - control your AI coding assistant from anywhere.

Similar to Happy Coder for Claude Code, but for OpenCode.

[中文文档](#中文文档)

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

---

# 中文文档

一个适配移动端的 PWA 客户端，用于 [OpenCode](https://github.com/sst/opencode) —— 随时随地控制你的 AI 编程助手。

类似于 Claude Code 的 Happy Coder，但专为 OpenCode 打造。

## 功能特性

- **PWA 支持**：可安装到 iOS/Android 主屏幕，获得原生应用般的体验
- **实时更新**：基于 SSE 的助手响应实时流式传输
- **会话管理**：创建、切换和管理多个编程会话
- **权限处理**：远程批准/拒绝工具执行请求
- **推送通知**：当助手需要你关注时收到通知
- **深色模式**：护眼设计，针对移动端优化

## 快速开始

### 1. 启动 OpenCode 服务器

在你的开发机器上：

```bash
# 启动 OpenCode 并开启 HTTP 服务
opencode serve --hostname 0.0.0.0 --port 4096
```

### 2. 将 CLI 连接到服务器（重要！）

如果你希望在 CLI 中看到来自 Anywhere 的消息（反之亦然），请使用 `attach` 命令连接到同一服务器：

```bash
# 在另一个终端中，将 CLI 附加到运行中的服务器
opencode attach http://localhost:4096
```

> **注意**：不使用 `attach` 直接运行 `opencode` 会启动一个独立的内部服务器。CLI 和 Anywhere 会共享相同的存储文件，但不会实时同步。使用 `attach` 可确保两个客户端连接到同一服务器并接收实时 SSE 更新。

### 3. 运行客户端

```bash
cd opencode-anywhere
npm install
npm run dev
```

在手机上打开 [http://localhost:3000](http://localhost:3000)（需在同一网络）。

### 4. 连接

输入你的 OpenCode 服务器地址（例如：`http://192.168.1.100:4096`）并连接。

## 远程访问（可选）

如需在本地网络外访问，可使用内置的中继服务器：

### 方案 A：中继服务器

```bash
cd server
npm install
cp .env.example .env
# 编辑 .env 填入你的 OpenCode 服务器信息
npm start
```

中继服务器会代理请求到你的 OpenCode 实例，实现随处访问。

### 方案 B：Cloudflare Tunnel（推荐）

```bash
# 安装 cloudflared
brew install cloudflared

# 创建到 OpenCode 的隧道
cloudflared tunnel --url http://localhost:4096
```

这会给你一个公共 HTTPS URL，无需暴露你的网络。

## 架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   移动端 PWA    │────▶│  Next.js API    │────▶│ OpenCode 服务器 │
│   (浏览器)      │◀────│    路由层       │◀────│   (端口 4096)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │ SSE 事件              │ 代理
        ▼                       ▼
    实时界面            /api/opencode/*
```

- **PWA 客户端**：使用 Zustand 状态管理的 React 界面
- **API 路由**：代理层（SDK 有 Node.js 依赖）
- **SSE**：用于实时更新的服务器发送事件

## 项目结构

```
src/
├── app/
│   ├── api/opencode/      # API 代理路由
│   │   ├── health/        # 连接检查
│   │   ├── sessions/      # 会话增删改查 + 消息
│   │   └── ...
│   ├── page.tsx           # 主应用（连接/聊天视图）
│   └── layout.tsx         # PWA meta 标签
├── components/
│   ├── ConnectionForm.tsx # 服务器 URL 输入
│   ├── SessionList.tsx    # 会话侧边栏
│   ├── MessageList.tsx    # 聊天消息
│   ├── MessageInput.tsx   # 消息编辑器
│   └── PermissionDialog.tsx # 权限弹窗
├── hooks/
│   ├── useSSE.ts          # 实时事件订阅
│   └── usePWA.ts          # 安装提示处理
├── lib/
│   └── opencode.ts        # OpenCode API HTTP 客户端
├── store/
│   └── index.ts           # Zustand store（持久化）
└── types/
    └── index.ts           # TypeScript 类型定义

public/
├── manifest.json          # PWA 清单
├── sw.js                  # Service Worker
└── icon.svg               # 应用图标

server/                    # 可选的中继服务器
├── index.js               # Express 代理
└── .env.example           # 配置文件
```

## 开发

```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start
```

## PWA 安装

### iOS
1. 在 Safari 中打开
2. 点击分享按钮
3. 选择"添加到主屏幕"

### Android
1. 在 Chrome 中打开
2. 点击"安装"提示（或菜单 → "安装应用"）

## 配置

### 环境变量

Next.js 应用不需要环境变量 - 服务器 URL 在界面中配置。

中继服务器配置（`server/.env`）：

```env
PORT=3001
OPENCODE_URL=http://localhost:4096
# 可选：AUTH_TOKEN=your-secret-token
```

## 常见问题

### "连接失败"
- 确保 OpenCode 正在运行：`opencode serve --hostname 0.0.0.0 --port 4096`
- 检查防火墙是否允许 4096 端口
- 确认 URL 包含协议：`http://` 而不仅仅是 IP

### SSE 不工作
- 某些企业代理会阻止 SSE
- 尝试使用中继服务器或 Cloudflare 隧道

### PWA 无法安装
- 必须通过 HTTPS（或 localhost）提供服务
- 检查浏览器是否支持 PWA（Safari iOS 11.3+，Chrome Android）

## 许可证

MIT

## 致谢

为 SST 的 [OpenCode](https://github.com/sst/opencode) 构建。
