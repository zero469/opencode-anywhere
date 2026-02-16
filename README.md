<div align="center">

<img src="https://raw.githubusercontent.com/zero469/opencode-anywhere/main/public/app-icon.png" width="120" height="120" alt="OpenCode Anywhere" style="border-radius: 22%;">

# OpenCode Anywhere

**Control [OpenCode](https://github.com/sst/opencode) from your iPhone — anytime, anywhere.**

[![Download on TestFlight](https://img.shields.io/badge/TestFlight-Download-blue?style=for-the-badge&logo=apple)](https://testflight.apple.com/join/ShuMKWur)
[![GitHub Stars](https://img.shields.io/github/stars/zero469/opencode-anywhere?style=for-the-badge&logo=github)](https://github.com/zero469/opencode-anywhere)

[English](#-features) • [中文](#中文)

</div>

---

## 📱 Screenshots

<div align="center">
<img src="https://raw.githubusercontent.com/zero469/opencode-anywhere/main/Device.png" width="200" alt="Devices">
<img src="https://raw.githubusercontent.com/zero469/opencode-anywhere/main/Message.PNG" width="200" alt="Chat">
<img src="https://raw.githubusercontent.com/zero469/opencode-anywhere/main/Skill.PNG" width="200" alt="Skills">
<img src="https://raw.githubusercontent.com/zero469/opencode-anywhere/main/Command.PNG" width="200" alt="Commands">
</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **End-to-End Encryption** | AES-256-GCM — relay server sees only encrypted data |
| 📱 **Native iOS Experience** | Built with Capacitor, optimized for mobile |
| 🔗 **QR Code Pairing** | Scan to connect, encryption key never leaves your devices |
| ⚡ **Real-time Streaming** | SSE-based live responses, just like the desktop TUI |
| 🖥️ **Multi-Device** | Manage multiple computers from one app |
| 🔔 **Smart Notifications** | Get notified when tasks complete or need approval |
| 💬 **Full Session Control** | Create, switch, pin, and manage coding sessions |
| ✅ **Remote Permissions** | Approve or deny tool executions from your phone |
| 🎨 **Dark Mode** | Easy on the eyes, day or night |

---

## 🚀 Quick Start

### 1. Download the App

<div align="center">

**[📲 Get it on TestFlight](https://testflight.apple.com/join/ShuMKWur)**

</div>

### 2. Setup Your Computer

Run the tunnel client on your development machine:

```bash
curl -fsSL https://github.com/zero469/opencode-relay-server/releases/latest/download/tunnel-client-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/') -o tunnel-client && chmod +x tunnel-client && ./tunnel-client
```

The tunnel client will:
- ✅ Prompt you to log in (create account in iOS app first)
- ✅ Display a QR code for secure pairing
- ✅ Auto-start OpenCode if not running
- ✅ Configure auto-start on boot

### 3. Pair & Go

1. Open the iOS app → Tap **"Scan QR Code"**
2. Scan the QR code in your terminal
3. Done! Start coding from anywhere 🎉

---

## 🔒 Security

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   iOS App   │◄──E2E──►│   Relay     │◄──E2E──►│   Tunnel    │
│             │ AES-256 │   Server    │ AES-256 │   Client    │
└─────────────┘         └─────────────┘         └──────┬──────┘
                                                       │ localhost
                                                       ▼
                                                ┌─────────────┐
                                                │  OpenCode   │
                                                └─────────────┘
```

- **Zero Knowledge**: Relay server only forwards encrypted blobs
- **Key in QR**: Encryption key embedded in QR code, never transmitted
- **Per-Device Auth**: Unique credentials, revocable anytime

---

## 🛠️ Alternatives

### Same Network (No relay)

```bash
opencode serve --hostname 0.0.0.0 --port 4096
# Open http://YOUR_IP:4096 on your phone
```

### Cloudflare Tunnel

```bash
brew install cloudflared
cloudflared tunnel create opencode
cloudflared tunnel route dns opencode opencode.yourdomain.com
cloudflared tunnel run opencode
```

---

## 🔗 Related

- [opencode-relay-server](https://github.com/zero469/opencode-relay-server) — Relay server & tunnel client
- [OpenCode](https://github.com/sst/opencode) — The AI coding assistant

---

<div align="center">

# 中文

**在 iPhone 上随时随地控制 [OpenCode](https://github.com/sst/opencode)**

</div>

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 🔐 **端对端加密** | AES-256-GCM 加密，中继服务器只能看到密文 |
| 📱 **原生 iOS 体验** | 基于 Capacitor，针对移动端优化 |
| 🔗 **二维码配对** | 扫码即连，密钥永不离开你的设备 |
| ⚡ **实时流式响应** | 基于 SSE，体验与桌面端一致 |
| 🖥️ **多设备管理** | 一个 App 管理多台电脑 |
| 🔔 **智能通知** | 任务完成或需要审批时收到通知 |
| 💬 **完整会话控制** | 创建、切换、置顶、管理编程会话 |
| ✅ **远程权限审批** | 在手机上批准或拒绝工具执行 |
| 🎨 **深色模式** | 护眼设计，昼夜皆宜 |

---

## 🚀 快速开始

### 1. 下载 App

<div align="center">

**[📲 在 TestFlight 下载](https://testflight.apple.com/join/ShuMKWur)**

</div>

### 2. 设置电脑

在开发机器上运行 tunnel client：

```bash
curl -fsSL https://github.com/zero469/opencode-relay-server/releases/latest/download/tunnel-client-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/') -o tunnel-client && chmod +x tunnel-client && ./tunnel-client
```

tunnel client 会：
- ✅ 提示登录（先在 iOS App 中注册）
- ✅ 显示配对二维码
- ✅ 自动启动 OpenCode
- ✅ 配置开机自启

### 3. 扫码连接

1. 打开 iOS App → 点击 **"扫描二维码"**
2. 扫描终端中的二维码
3. 完成！随时随地开始编程 🎉

---

## 🔒 安全架构

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   iOS App   │◄──E2E──►│  中继服务器  │◄──E2E──►│   Tunnel    │
│             │ AES-256 │             │ AES-256 │   Client    │
└─────────────┘         └─────────────┘         └──────┬──────┘
                                                       │ 本地
                                                       ▼
                                                ┌─────────────┐
                                                │  OpenCode   │
                                                └─────────────┘
```

- **零知识**: 中继服务器只转发加密数据
- **密钥在二维码中**: 加密密钥嵌入二维码，从不传输
- **设备独立认证**: 唯一凭证，随时可撤销

---

## 🛠️ 替代方案

### 同一网络（无需中继）

```bash
opencode serve --hostname 0.0.0.0 --port 4096
# 手机打开 http://你的IP:4096
```

### Cloudflare Tunnel

```bash
brew install cloudflared
cloudflared tunnel create opencode
cloudflared tunnel route dns opencode opencode.yourdomain.com
cloudflared tunnel run opencode
```

---

## 🔗 相关项目

- [opencode-relay-server](https://github.com/zero469/opencode-relay-server) — 中继服务器和 tunnel client
- [OpenCode](https://github.com/sst/opencode) — AI 编程助手

---

<div align="center">

**MIT License** • Built with ❤️ for the OpenCode community

</div>
