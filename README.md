# OpenCode Anywhere

A mobile-friendly client for [OpenCode](https://github.com/sst/opencode) - control your AI coding assistant from anywhere.

Similar to Happy Coder for Claude Code, but for OpenCode.

**Now available as a native iOS app!**

[中文文档](#中文文档)

## Features

- **Native iOS App**: Full native experience with Capacitor - smoother scrolling, better performance
- **PWA Support**: Install on iOS/Android home screen for native-like experience
- **Real-time Updates**: SSE-based live streaming of assistant responses
- **Session Management**: Create, switch, and manage multiple coding sessions
- **On-demand Pagination**: Load messages incrementally for large sessions (2000+ messages)
- **Permission Handling**: Approve/deny tool executions remotely
- **Push Notifications**: Get notified when assistant needs your attention (native iOS notifications)
- **Dark Mode**: Easy on the eyes, optimized for mobile
- **Relay Server Integration**: Secure remote access via opencode-relay-server

## Quick Start

### Option 1: Native iOS App (Recommended)

1. Clone the repo and install dependencies:
```bash
git clone https://github.com/anthropics/opencode-anywhere.git
cd opencode-anywhere
npm install
```

2. Build and sync with iOS:
```bash
npm run build:native
```

3. Open in Xcode and run:
```bash
npx cap open ios
# Press Cmd+R in Xcode to build and run on your device
```

### Option 2: PWA (Web Browser)

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

Secure access from anywhere with Cloudflare Access authentication.

#### 1. Install and Login

```bash
# Install cloudflared
brew install cloudflared

# Login to Cloudflare (requires a domain hosted on Cloudflare)
cloudflared tunnel login
```

#### 2. Create Tunnel

```bash
# Create a tunnel
cloudflared tunnel create opencode-anywhere

# Note the tunnel ID from output, e.g.: eaed4628-ce9c-4be8-b6e0-6afd9ecd43bb
```

#### 3. Configure Tunnel

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/<YOUR_USERNAME>/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: anywhere.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

> **Note**: Only expose the Anywhere frontend (port 3000). The OpenCode API (port 4096) stays local - Anywhere's server-side proxies requests to it securely.

#### 4. Add DNS Route

```bash
cloudflared tunnel route dns opencode-anywhere anywhere.yourdomain.com
```

#### 5. Setup Cloudflare Access (Authentication)

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. Create a team (free plan works)
3. **Settings** → **Authentication** → Add **GitHub** or **Google** login
4. **Access** → **Applications** → Add application:
   - Type: Self-hosted
   - Domain: `anywhere.yourdomain.com`
5. Add a policy to allow only your email/GitHub account

#### 6. Start Tunnel

```bash
# Use http2 protocol if quic has issues
cloudflared tunnel --protocol http2 run opencode-anywhere
```

#### 7. Auto-start on macOS

Create `~/Library/LaunchAgents/com.cloudflare.cloudflared.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.cloudflared</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/cloudflared</string>
        <string>tunnel</string>
        <string>--protocol</string>
        <string>http2</string>
        <string>run</string>
        <string>opencode-anywhere</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/cloudflared.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cloudflared.log</string>
</dict>
</plist>
```

Load the service:

```bash
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
```

#### 8. Connect from Anywhere

1. Open `https://anywhere.yourdomain.com`
2. Login with GitHub/Google
3. Server URL: `http://localhost:4096`

Your OpenCode is now securely accessible from anywhere!

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  iOS Native App │────▶│  Relay Server   │────▶│ OpenCode Server │
│  or Mobile PWA  │◀────│  (Optional)     │◀────│   (Port 4096)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │ SSE Events            │ Proxy + Auth
        ▼                       ▼
   Real-time UI          HTTPS with frp
```

- **iOS App**: Native Capacitor app with WKWebView for optimal performance
- **PWA Client**: React UI with Zustand state management
- **Relay Server**: Optional proxy for secure remote access (see [opencode-relay-server](https://github.com/anthropics/opencode-relay-server))
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
│   ├── MessageList.tsx    # Chat messages with infinite scroll
│   ├── MessageInput.tsx   # Message composer
│   └── PermissionDialog.tsx # Permission modal
├── hooks/
│   ├── useSSE.ts          # Real-time event subscription
│   └── usePWA.ts          # Install prompt handling
├── lib/
│   ├── opencode.ts        # HTTP client for OpenCode API
│   ├── notifications.ts   # iOS native notifications
│   └── relay.ts           # Relay server client
├── store/
│   └── index.ts           # Zustand store (persisted)
└── types/
    └── index.ts           # TypeScript definitions

ios/                       # Capacitor iOS project
├── App/
│   ├── App.xcodeproj      # Xcode project
│   └── App/public/        # Built web assets
└── ...

public/
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker
└── icon.svg               # App icon
```

## Development

```bash
# Install dependencies
npm install

# Run development server (web)
npm run dev

# Build for production
npm run build

# Build for iOS
npm run build:native

# Open iOS project in Xcode
npx cap open ios

# Run tests
npm test
```

## iOS Development

The native iOS app uses Capacitor to wrap the web app in a native shell.

```bash
# Build web assets and sync to iOS
npm run build:native

# Open in Xcode
npx cap open ios

# Build and run (Cmd+R in Xcode)
```

### Requirements
- Xcode 15+
- iOS 15+ device or simulator
- Apple Developer account (for device testing)

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

一个适配移动端的客户端，用于 [OpenCode](https://github.com/sst/opencode) —— 随时随地控制你的 AI 编程助手。

类似于 Claude Code 的 Happy Coder，但专为 OpenCode 打造。

**现已推出原生 iOS 应用！**

## 功能特性

- **原生 iOS 应用**：基于 Capacitor 的完整原生体验 - 更流畅的滚动，更好的性能
- **PWA 支持**：可安装到 iOS/Android 主屏幕，获得原生应用般的体验
- **实时更新**：基于 SSE 的助手响应实时流式传输
- **会话管理**：创建、切换和管理多个编程会话
- **按需分页**：大型会话（2000+ 消息）增量加载消息
- **权限处理**：远程批准/拒绝工具执行请求
- **推送通知**：当助手需要你关注时收到通知（原生 iOS 通知）
- **深色模式**：护眼设计，针对移动端优化
- **中继服务器集成**：通过 opencode-relay-server 实现安全远程访问

## 快速开始

### 方案 1：原生 iOS 应用（推荐）

1. 克隆仓库并安装依赖：
```bash
git clone https://github.com/anthropics/opencode-anywhere.git
cd opencode-anywhere
npm install
```

2. 构建并同步到 iOS：
```bash
npm run build:native
```

3. 在 Xcode 中打开并运行：
```bash
npx cap open ios
# 在 Xcode 中按 Cmd+R 构建并运行到设备
```

### 方案 2：PWA（网页浏览器）

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

通过 Cloudflare Access 认证实现安全的远程访问。

#### 1. 安装并登录

```bash
# 安装 cloudflared
brew install cloudflared

# 登录 Cloudflare（需要有域名托管在 Cloudflare）
cloudflared tunnel login
```

#### 2. 创建隧道

```bash
# 创建隧道
cloudflared tunnel create opencode-anywhere

# 记录输出中的隧道 ID，例如：eaed4628-ce9c-4be8-b6e0-6afd9ecd43bb
```

#### 3. 配置隧道

创建 `~/.cloudflared/config.yml`：

```yaml
tunnel: <你的隧道ID>
credentials-file: /Users/<你的用户名>/.cloudflared/<你的隧道ID>.json

ingress:
  - hostname: anywhere.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

> **注意**：只暴露 Anywhere 前端（端口 3000）。OpenCode API（端口 4096）保持本地访问 - Anywhere 的服务端会安全地代理请求。

#### 4. 添加 DNS 路由

```bash
cloudflared tunnel route dns opencode-anywhere anywhere.yourdomain.com
```

#### 5. 设置 Cloudflare Access（身份认证）

1. 访问 [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. 创建团队（免费计划即可）
3. **设置** → **身份验证** → 添加 **GitHub** 或 **Google** 登录
4. **访问控制** → **应用程序** → 添加应用：
   - 类型：自托管
   - 域名：`anywhere.yourdomain.com`
5. 添加策略，只允许你的邮箱/GitHub 账号访问

#### 6. 启动隧道

```bash
# 如果 quic 协议有问题，使用 http2
cloudflared tunnel --protocol http2 run opencode-anywhere
```

#### 7. macOS 开机自启

创建 `~/Library/LaunchAgents/com.cloudflare.cloudflared.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.cloudflared</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/cloudflared</string>
        <string>tunnel</string>
        <string>--protocol</string>
        <string>http2</string>
        <string>run</string>
        <string>opencode-anywhere</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/cloudflared.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cloudflared.log</string>
</dict>
</plist>
```

加载服务：

```bash
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
```

#### 8. 随时随地连接

1. 打开 `https://anywhere.yourdomain.com`
2. 使用 GitHub/Google 登录
3. Server URL 填：`http://localhost:4096`

现在你可以从任何地方安全访问你的 OpenCode 了！

## 架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  iOS 原生应用   │────▶│   中继服务器    │────▶│ OpenCode 服务器 │
│  或移动端 PWA   │◀────│   (可选)        │◀────│   (端口 4096)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │ SSE 事件              │ 代理 + 认证
        ▼                       ▼
    实时界面              HTTPS + frp
```

- **iOS 应用**：基于 Capacitor 的原生应用，使用 WKWebView 实现最佳性能
- **PWA 客户端**：使用 Zustand 状态管理的 React 界面
- **中继服务器**：可选的安全远程访问代理（见 [opencode-relay-server](https://github.com/anthropics/opencode-relay-server)）
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
│   ├── MessageList.tsx    # 聊天消息（支持无限滚动）
│   ├── MessageInput.tsx   # 消息编辑器
│   └── PermissionDialog.tsx # 权限弹窗
├── hooks/
│   ├── useSSE.ts          # 实时事件订阅
│   └── usePWA.ts          # 安装提示处理
├── lib/
│   ├── opencode.ts        # OpenCode API HTTP 客户端
│   ├── notifications.ts   # iOS 原生通知
│   └── relay.ts           # 中继服务器客户端
├── store/
│   └── index.ts           # Zustand store（持久化）
└── types/
    └── index.ts           # TypeScript 类型定义

ios/                       # Capacitor iOS 项目
├── App/
│   ├── App.xcodeproj      # Xcode 项目
│   └── App/public/        # 构建后的 web 资源
└── ...

public/
├── manifest.json          # PWA 清单
├── sw.js                  # Service Worker
└── icon.svg               # 应用图标
```

## 开发

```bash
# 安装依赖
npm install

# 运行开发服务器（网页）
npm run dev

# 生产构建
npm run build

# 构建 iOS
npm run build:native

# 在 Xcode 中打开 iOS 项目
npx cap open ios

# 运行测试
npm test
```

## iOS 开发

原生 iOS 应用使用 Capacitor 将 web 应用包装在原生外壳中。

```bash
# 构建 web 资源并同步到 iOS
npm run build:native

# 在 Xcode 中打开
npx cap open ios

# 构建并运行（在 Xcode 中按 Cmd+R）
```

### 要求
- Xcode 15+
- iOS 15+ 设备或模拟器
- Apple 开发者账号（设备测试需要）

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
