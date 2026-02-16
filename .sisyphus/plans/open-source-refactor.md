# OpenCode Anywhere 开源改造计划

## TL;DR

> **目标**: 移除多用户认证系统，改为单设备自建模式，让用户可以自己部署 relay server，无需登录
> 
> **核心改动**:
> - Server: 去掉数据库、用户系统、邮件服务，简化为单设备 WebSocket 转发
> - App: 去掉登录页面，扫码后直接连接用户自建的 relay server
> - Client: 去掉登录流程，生成 QR 码时包含自建 server 地址
>
> **预估工作量**: Medium (2-3 天)

---

## 当前架构分析

### 数据流
```
┌─────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│  iPhone App │ ←──→ │  Relay Server (你的)  │ ←──→ │ tunnel-client   │
│             │ WSS  │  - 用户认证           │  WS  │ (用户电脑)       │
│             │      │  - 设备管理           │      │                 │
│             │      │  - 多租户             │      │ ↓               │
└─────────────┘      └──────────────────────┘      │ OpenCode :4096  │
                                                   └─────────────────┘
```

### 现有组件

**Relay Server** (`opencode-relay-server`):
- `internal/handlers/auth.go` - 用户注册、登录、邮件验证码
- `internal/handlers/device.go` - 设备 CRUD、frpc 配置
- `internal/handlers/pairing.go` - 配对流程（需要认证）
- `internal/services/email.go` - 发送验证码邮件
- `internal/database/` - SQLite 数据库
- `internal/tunnel/manager.go` - WebSocket 隧道转发 ⭐ (核心，保留)

**iOS App** (`opencode-anywhere`):
- `src/components/AuthScreen.tsx` - 登录/注册页面
- `src/lib/relay.ts` - Relay API 调用（登录、设备管理）
- `src/store/index.ts` - `relayToken`, `user` 状态管理
- QR 扫描时从 server 完成配对

**Tunnel Client** (`cmd/tunnel-client/main.go`):
- 登录流程 (`doLogin`)
- 配对流程 (`startPairing`) - 生成 QR 码
- 隧道连接 (`runTunnel`) ⭐ (核心，保留)

---

## 目标架构

```
┌─────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│  iPhone App │ ←──→ │  Relay Server        │ ←──→ │ tunnel-client   │
│             │ WSS  │  (用户自建)           │  WS  │ (用户电脑)       │
│  扫码获得:   │      │  - 无认证            │      │                 │
│  - server地址│      │  - 单设备模式         │      │ 生成 QR 码包含: │
│  - subdomain │      │  - WebSocket转发     │      │ - server 地址   │
│  - 加密密钥  │      │                      │      │ - subdomain     │
└─────────────┘      └──────────────────────┘      │ - 加密密钥      │
                                                   └─────────────────┘
```

**关键变化**:
1. **无登录** - 扫码即连接
2. **单设备** - 每个 relay server 只服务一个 tunnel-client
3. **用户自建** - Docker one-liner 部署
4. **加密密钥在 QR 码中** - E2E 加密保持不变

---

## 修改计划

### Phase 1: Relay Server 简化

#### 1.1 创建简化版 server

**新建文件**: `cmd/server-lite/main.go`

保留:
- WebSocket 隧道转发 (`internal/tunnel/manager.go`)
- HTTP 代理转发 (`internal/tunnel/handler.go`)
- 健康检查端点

删除/跳过:
- 用户认证 (`internal/handlers/auth.go`)
- 设备管理 (`internal/handlers/device.go`)
- 配对流程 (`internal/handlers/pairing.go`)
- 数据库 (`internal/database/`)
- 邮件服务 (`internal/services/email.go`)

**新增**: 简单的连接认证
```go
// 环境变量配置
RELAY_AUTH_USER=xxx      // tunnel-client 连接时验证
RELAY_AUTH_PASSWORD=xxx  // 可选，不设则不验证
RELAY_SUBDOMAIN=default  // 固定 subdomain
```

**端点**:
```
GET  /health                    - 健康检查
WS   /api/tunnel/:subdomain     - tunnel-client 连接
WS   /api/events/:subdomain     - App 事件订阅
POST /proxy/:subdomain/*        - HTTP 代理到 OpenCode
```

#### 1.2 Docker 部署

**新建文件**: `Dockerfile.lite`
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o server-lite ./cmd/server-lite

FROM alpine:latest
COPY --from=builder /app/server-lite /server-lite
EXPOSE 8080
CMD ["/server-lite"]
```

**部署命令**:
```bash
docker run -d -p 8080:8080 \
  -e RELAY_AUTH_USER=myuser \
  -e RELAY_AUTH_PASSWORD=mypass \
  ghcr.io/zero469/opencode-relay-server:lite
```

---

### Phase 2: Tunnel Client 简化

#### 2.1 去掉登录流程

修改 `cmd/tunnel-client/main.go`:

```go
// 之前: 需要登录 → 创建配对 → 等待 App 扫码 → 获得 device 配置
// 之后: 直接读取配置 → 生成 QR 码 → 连接 relay

func cmdStart() {
    config := loadOrCreateConfig()  // 从环境变量或配置文件
    
    // 生成 QR 码让 App 扫描
    qrData := QRData{
        Version:       2,  // 新版本
        RelayURL:      config.RelayURL,
        Subdomain:     config.Subdomain,
        AuthUser:      config.AuthUser,
        AuthPassword:  config.AuthPassword,
        EncryptionKey: config.EncryptionKey,
        Hostname:      hostname,
    }
    displayQRCode(qrData)
    
    // 直接连接 relay
    runTunnel(config, localPort)
}
```

#### 2.2 配置来源

**环境变量** (优先):
```bash
RELAY_URL=https://my-relay.example.com
RELAY_SUBDOMAIN=default
RELAY_AUTH_USER=xxx
RELAY_AUTH_PASSWORD=xxx
```

**配置文件** (`~/.opencode-tunnel/config.json`):
```json
{
  "relay_url": "https://my-relay.example.com",
  "subdomain": "default",
  "auth_user": "xxx",
  "auth_password": "xxx",
  "encryption_key": "auto-generated-on-first-run"
}
```

**首次运行**: 如果没有配置，交互式询问 relay URL，生成随机 auth 和 encryption key

---

### Phase 3: iOS App 简化

#### 3.1 去掉登录页面

**删除/修改**:
- `src/components/AuthScreen.tsx` → 删除或改为"添加设备"引导页
- `src/lib/relay.ts` → 去掉 `login`, `register`, `sendVerification`
- `src/store/index.ts` → 去掉 `relayToken`, `user`, `login`, `logout`

**新流程**:
```
App 启动 → 显示已保存的设备列表 → 点击"添加设备" → 扫描 QR 码 → 保存设备配置 → 连接
```

#### 3.2 修改 QR 码处理

**当前 QR 数据** (v1):
```json
{
  "v": 1,
  "r": "relay_url",
  "p": "pairing_id",      // 需要 server 配对
  "c": "pairing_code",    // 需要 server 验证
  "h": "hostname",
  "k": "encryption_key"
}
```

**新 QR 数据** (v2):
```json
{
  "v": 2,
  "r": "relay_url",
  "s": "subdomain",
  "u": "auth_user",
  "p": "auth_password",
  "h": "hostname",
  "k": "encryption_key"
}
```

#### 3.3 修改设备存储

**当前**: 从 server 获取设备列表
**之后**: 本地存储设备配置

```typescript
interface LocalDevice {
  id: string;           // 本地生成 UUID
  name: string;         // hostname 或用户输入
  relayUrl: string;
  subdomain: string;
  authUser: string;
  authPassword: string;
  encryptionKey: string;
  addedAt: Date;
  lastConnected?: Date;
}
```

存储: `@capacitor/preferences` (已在用)

#### 3.4 修改连接逻辑

**当前**: 
```typescript
// 1. 登录获得 token
// 2. 用 token 获取 frpc 配置
// 3. 连接 relay
const frpcConfig = await relay.getFrpcConfig(relayToken, device.id);
opencode.initClient({ baseUrl: `https://relay/proxy/${frpcConfig.subdomain}` });
```

**之后**:
```typescript
// 直接用本地保存的配置连接
opencode.initClient({
  baseUrl: `${device.relayUrl}/proxy/${device.subdomain}`,
  authUser: device.authUser,
  authPassword: device.authPassword,
});
```

---

### Phase 4: 文档和部署

#### 4.1 README.md

```markdown
# OpenCode Anywhere

远程控制 OpenCode 的 iOS 应用。

## 快速开始

### 1. 部署 Relay Server

```bash
docker run -d -p 8080:8080 \
  -e RELAY_AUTH_USER=$(openssl rand -hex 16) \
  -e RELAY_AUTH_PASSWORD=$(openssl rand -hex 16) \
  ghcr.io/zero469/opencode-relay-server:lite
```

### 2. 安装 Tunnel Client

```bash
# macOS/Linux
curl -sSL https://github.com/zero469/opencode-relay-server/releases/latest/download/install.sh | bash

# Windows
irm https://github.com/zero469/opencode-relay-server/releases/latest/download/install.ps1 | iex
```

### 3. 配置并启动

```bash
export RELAY_URL=https://your-relay.example.com
tunnel-client start
```

### 4. 扫描 QR 码

用 OpenCode Anywhere App 扫描终端显示的 QR 码即可连接。

## 部署选项

- **Fly.io**: `fly launch --image ghcr.io/zero469/opencode-relay-server:lite`
- **Railway**: One-click deploy button
- **VPS**: Docker Compose 示例
- **Cloudflare Tunnel**: 配置指南
```

#### 4.2 GitHub Actions

- 自动构建 Docker 镜像
- 发布 tunnel-client 二进制到 Releases
- 构建 iOS App 到 TestFlight

---

## 迁移策略

### 兼容性

**QR 码版本检测**:
```typescript
function handleQRCode(data: QRData) {
  if (data.v === 1) {
    // 旧版: 需要登录和配对流程
    // 显示提示: "请更新 tunnel-client"
  } else if (data.v === 2) {
    // 新版: 直接连接
    saveDeviceLocally(data);
    connect(data);
  }
}
```

### 时间线

1. **Week 1**: 完成 server-lite 和 tunnel-client 修改
2. **Week 2**: 完成 iOS App 修改和测试
3. **Week 3**: 文档、CI/CD、发布

---

## 风险和注意事项

### 安全

1. **无认证的 relay server 暴露在公网** 
   - 解决: `RELAY_AUTH_USER/PASSWORD` 必须设置
   - WebSocket 连接时验证

2. **QR 码包含敏感信息**
   - 解决: QR 码只在本地显示，不通过网络传输
   - 加密密钥保护实际数据

### 功能

1. **多设备支持**
   - 新架构: 一个 relay server = 一个设备
   - 如果需要多设备: 部署多个 relay server 或支持多 subdomain

2. **设备离线检测**
   - 之前: server 维护设备在线状态
   - 之后: App 直接检测 WebSocket 连接状态

---

## 文件变更清单

### Relay Server (`opencode-relay-server`)

| 文件 | 操作 | 说明 |
|------|------|------|
| `cmd/server-lite/main.go` | 新建 | 简化版入口 |
| `Dockerfile.lite` | 新建 | 精简 Docker 镜像 |
| `docker-compose.yml` | 新建 | 示例部署配置 |
| `internal/tunnel/` | 保留 | 核心转发逻辑 |
| `internal/handlers/auth.go` | 保留 | 仅完整版使用 |
| `internal/database/` | 保留 | 仅完整版使用 |

### Tunnel Client (`opencode-relay-server/cmd/tunnel-client`)

| 文件 | 操作 | 说明 |
|------|------|------|
| `main.go` | 修改 | 去掉登录，简化配对 |
| `config.go` | 新建 | 配置管理逻辑 |

### iOS App (`opencode-anywhere`)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/AuthScreen.tsx` | 删除 | 不再需要登录 |
| `src/components/QRScanner.tsx` | 修改 | 支持 v2 QR 格式 |
| `src/components/DeviceList.tsx` | 修改 | 本地设备管理 |
| `src/lib/relay.ts` | 大改 | 去掉认证相关 API |
| `src/store/index.ts` | 修改 | 去掉 relayToken/user |
| `src/app/page.tsx` | 修改 | 去掉登录判断 |
| `src/types/index.ts` | 修改 | 新 QR 数据类型 |

---

## 后续可选优化

1. **多 subdomain 支持** - 一个 server 支持多个设备
2. **WebRTC 直连** - 去掉 relay server，P2P 连接
3. **Cloudflare Tunnel 集成** - 免费的公网穿透
4. **Apple Watch App** - 快速查看状态
