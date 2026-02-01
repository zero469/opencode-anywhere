# OpenCode Anywhere

<div align="center">

<img src="https://raw.githubusercontent.com/zero469/opencode-anywhere/main/public/app-icon.png" width="128" height="128" alt="OpenCode Anywhere Logo" style="border-radius: 22%;">

**Control your AI coding assistant from anywhere**

A native iOS app for [OpenCode](https://github.com/sst/opencode) - like Happy Coder for Claude Code, but for OpenCode.

[![Download on TestFlight](https://img.shields.io/badge/Download-TestFlight-blue?style=for-the-badge&logo=apple)](https://testflight.apple.com/join/ShuMKWur)
[![GitHub Stars](https://img.shields.io/github/stars/zero469/opencode-anywhere?style=for-the-badge)](https://github.com/zero469/opencode-anywhere)

[English](#features) | [中文](#中文文档)

</div>

---

## Features

- **Native iOS App** - Full native experience with Capacitor, available on TestFlight
- **QR Code Pairing** - Scan to connect, no manual URL entry needed
- **End-to-End Encryption** - AES-256-GCM encryption, relay server sees only encrypted data
- **Real-time Updates** - SSE-based live streaming of assistant responses
- **Multi-Device Management** - Connect to multiple computers from one app
- **Push Notifications** - Get notified when assistant needs your attention
- **Session Management** - Create, switch, and manage multiple coding sessions
- **Permission Handling** - Approve/deny tool executions remotely
- **Dark Mode** - Easy on the eyes, optimized for mobile

## Quick Start

### Step 1: Download the App

<div align="center">

**[Download OpenCode Anywhere on TestFlight](https://testflight.apple.com/join/ShuMKWur)**

</div>

### Step 2: Setup Your Computer

Run the tunnel client on each computer you want to access remotely:

```bash
# Download and run (macOS/Linux)
curl -L https://github.com/zero469/opencode-relay-server/releases/latest/download/tunnel-client-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/') -o tunnel-client && chmod +x tunnel-client && ./tunnel-client
```

Or download manually from [Releases](https://github.com/zero469/opencode-relay-server/releases).

The tunnel client will:
1. Prompt you to login (create account in the iOS app first)
2. Display a QR code for pairing
3. Auto-start OpenCode if not running
4. Configure auto-start on boot

### Step 3: Pair Your Device

1. Open the iOS app
2. Tap "Scan QR Code"
3. Scan the QR code shown in your terminal
4. Done! Your device appears in the app

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │   E2E   │                 │   E2E   │                 │
│    iOS App      │◄───────►│  Relay Server   │◄───────►│  tunnel-client  │
│                 │ Encrypt │   (fly.io)      │ Encrypt │                 │
└─────────────────┘         └─────────────────┘         └────────┬────────┘
                                                                 │
                                                                 │ HTTP
                                                                 ▼
                                                        ┌─────────────────┐
                                                        │ OpenCode Server │
                                                        │  (localhost)    │
                                                        └─────────────────┘
```

### Security Model

- **E2E Encryption**: Data between iOS app and tunnel-client is encrypted with AES-256-GCM
- **Key Exchange**: Encryption key is embedded in QR code, never sent to relay server
- **Zero Knowledge**: Relay server only forwards encrypted traffic, cannot read your code
- **Device Auth**: Each device has unique credentials, revocable from the app

## Alternative: Local Network / Cloudflare Tunnel

Don't want to use the relay server? You can also:

### Option A: Same Network (PWA)

```bash
# On your computer
opencode serve --hostname 0.0.0.0 --port 4096

# Open http://YOUR_IP:4096 on your phone
```

### Option B: Cloudflare Tunnel

For secure remote access without our relay server:

```bash
# Install cloudflared
brew install cloudflared

# Create and configure tunnel
cloudflared tunnel create opencode
cloudflared tunnel route dns opencode anywhere.yourdomain.com

# Start tunnel
cloudflared tunnel run opencode
```

Then set up [Cloudflare Access](https://one.dash.cloudflare.com/) for authentication.

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
```

### iOS Development

```bash
# Build web assets and sync to iOS
npm run build:native

# Open in Xcode
npx cap open ios

# Build and run (Cmd+R in Xcode)
```

Requirements:
- Xcode 15+
- iOS 15+ device or simulator
- Apple Developer account (for device testing)

## Related Projects

- **[opencode-relay-server](https://github.com/zero469/opencode-relay-server)** - The relay server and tunnel-client
- **[OpenCode](https://github.com/sst/opencode)** - The AI coding assistant

## License

MIT

## Credits

Built for use with [OpenCode](https://github.com/sst/opencode) by SST.

---

# 中文文档

<div align="center">

**随时随地控制你的 AI 编程助手**

一个为 [OpenCode](https://github.com/sst/opencode) 打造的原生 iOS 应用 - 类似 Claude Code 的 Happy Coder。

</div>

---

## 功能特性

- **原生 iOS 应用** - 基于 Capacitor 的完整原生体验，已上架 TestFlight
- **二维码配对** - 扫码即连，无需手动输入 URL
- **端对端加密** - AES-256-GCM 加密，中继服务器只能看到加密数据
- **实时更新** - 基于 SSE 的助手响应实时流式传输
- **多设备管理** - 一个 App 管理多台电脑
- **推送通知** - 当助手需要你关注时收到通知
- **会话管理** - 创建、切换和管理多个编程会话
- **权限处理** - 远程批准/拒绝工具执行请求
- **深色模式** - 护眼设计，针对移动端优化

## 快速开始

### 第一步：下载 App

<div align="center">

**[在 TestFlight 下载 OpenCode Anywhere](https://testflight.apple.com/join/ShuMKWur)**

</div>

### 第二步：设置电脑

在每台需要远程访问的电脑上运行 tunnel client：

```bash
# 下载并运行 (macOS/Linux)
curl -L https://github.com/zero469/opencode-relay-server/releases/latest/download/tunnel-client-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/') -o tunnel-client && chmod +x tunnel-client && ./tunnel-client
```

或从 [Releases](https://github.com/zero469/opencode-relay-server/releases) 手动下载。

tunnel client 会：
1. 提示你登录（先在 iOS App 中创建账号）
2. 显示配对二维码
3. 自动启动 OpenCode（如果没运行）
4. 配置开机自启

### 第三步：配对设备

1. 打开 iOS App
2. 点击"扫描二维码"
3. 扫描终端中显示的二维码
4. 完成！设备会出现在 App 中

## 架构

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │   E2E   │                 │   E2E   │                 │
│    iOS App      │◄───────►│   中继服务器     │◄───────►│  tunnel-client  │
│                 │   加密   │   (fly.io)      │   加密   │                 │
└─────────────────┘         └─────────────────┘         └────────┬────────┘
                                                                 │
                                                                 │ HTTP
                                                                 ▼
                                                        ┌─────────────────┐
                                                        │ OpenCode 服务器  │
                                                        │   (本地)         │
                                                        └─────────────────┘
```

### 安全模型

- **端对端加密**：iOS App 与 tunnel-client 之间的数据使用 AES-256-GCM 加密
- **密钥交换**：加密密钥嵌入二维码，从不发送到中继服务器
- **零知识**：中继服务器只转发加密流量，无法读取你的代码
- **设备认证**：每个设备有唯一凭证，可从 App 中撤销

## 备选方案：本地网络 / Cloudflare Tunnel

不想使用中继服务器？你也可以：

### 方案 A：同一网络 (PWA)

```bash
# 在你的电脑上
opencode serve --hostname 0.0.0.0 --port 4096

# 在手机上打开 http://你的IP:4096
```

### 方案 B：Cloudflare Tunnel

无需我们的中继服务器实现安全远程访问：

```bash
# 安装 cloudflared
brew install cloudflared

# 创建并配置隧道
cloudflared tunnel create opencode
cloudflared tunnel route dns opencode anywhere.yourdomain.com

# 启动隧道
cloudflared tunnel run opencode
```

然后设置 [Cloudflare Access](https://one.dash.cloudflare.com/) 进行身份验证。

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
```

### iOS 开发

```bash
# 构建 web 资源并同步到 iOS
npm run build:native

# 在 Xcode 中打开
npx cap open ios

# 构建并运行（在 Xcode 中按 Cmd+R）
```

要求：
- Xcode 15+
- iOS 15+ 设备或模拟器
- Apple 开发者账号（设备测试需要）

## 相关项目

- **[opencode-relay-server](https://github.com/zero469/opencode-relay-server)** - 中继服务器和 tunnel-client
- **[OpenCode](https://github.com/sst/opencode)** - AI 编程助手

## 许可证

MIT

## 致谢

为 SST 的 [OpenCode](https://github.com/sst/opencode) 构建。
