# Go Relay Server 部署 (fly.io)

Go 服务部署到 fly.io 的完整流程。

## 前置条件

```bash
# 安装 flyctl
brew install flyctl

# 登录
fly auth login
```

## 项目结构

```
project/
├── cmd/
│   └── server/
│       └── main.go       # 入口
├── internal/             # 业务逻辑
├── Dockerfile            # 构建配置
├── fly.toml              # fly.io 配置
├── go.mod
└── go.sum
```

## Dockerfile

```dockerfile
FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]
```

关键点：
- 多阶段构建减小镜像体积
- `CGO_ENABLED=0` 静态编译，无需 glibc
- `ca-certificates` 用于 HTTPS 请求

## fly.toml 配置

```toml
app = 'your-app-name'
primary_region = 'sin'  # 新加坡，亚洲用户推荐

[build]
# 使用 Dockerfile 构建

[http_service]
  internal_port = 8080      # 应用监听端口
  force_https = true        # 强制 HTTPS
  auto_stop_machines = 'stop'   # 无流量时停止
  auto_start_machines = true    # 有请求时自动启动
  min_machines_running = 1      # 至少保持 1 台运行

# 持久化存储
[mounts]
  source = "data"
  destination = "/app/data"

[env]
  PORT = "8080"
  DATABASE_PATH = "/app/data/relay.db"
```

## 初始化部署

### 1. 创建应用

```bash
# 在项目目录
fly launch

# 按提示选择：
# - App name
# - Region (sin = 新加坡)
# - 不需要 Postgres/Redis (除非需要)
```

### 2. 创建持久化存储

```bash
# 创建 volume (如果需要持久化数据)
fly volumes create data --size 1 --region sin
```

### 3. 设置 Secrets

```bash
# 设置环境变量 (敏感信息)
fly secrets set JWT_SECRET="your-secret-key"
fly secrets set API_KEY="your-api-key"

# 查看已设置的 secrets
fly secrets list
```

### 4. 部署

```bash
fly deploy
```

## 日常操作

### 部署更新

```bash
fly deploy
```

### 查看日志

```bash
# 实时日志
fly logs

# 最近日志
fly logs --no-tail
```

### 查看状态

```bash
# 应用状态
fly status

# 机器列表
fly machines list
```

### SSH 进入容器

```bash
fly ssh console
```

### 查看 Volume

```bash
fly volumes list
```

## 扩缩容

### 手动扩容

```bash
# 增加机器
fly scale count 2

# 调整机器规格
fly scale vm shared-cpu-1x --memory 512
```

### 自动扩缩

在 `fly.toml` 中配置：

```toml
[http_service]
  min_machines_running = 1
  auto_stop_machines = 'stop'
  auto_start_machines = true

[[http_service.concurrency]]
  type = "connections"
  hard_limit = 100
  soft_limit = 80
```

## 自定义域名

### 1. 添加域名

```bash
fly certs create your-domain.com
```

### 2. 配置 DNS

按提示配置 CNAME 或 A 记录：
- CNAME: `your-app-name.fly.dev`
- 或 A 记录指向提供的 IP

### 3. 验证

```bash
fly certs show your-domain.com
```

## 多区域部署

```bash
# 添加区域
fly regions add hkg  # 香港
fly regions add nrt  # 东京

# 每个区域创建 volume
fly volumes create data --size 1 --region hkg
fly volumes create data --size 1 --region nrt

# 部署
fly deploy
```

## GitHub Actions 自动部署

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

获取 API Token：

```bash
fly tokens create deploy
```

将 token 添加到 GitHub Secrets: `FLY_API_TOKEN`

## 常见问题

### 部署失败 - 健康检查

默认健康检查 `GET /`，确保应用响应 200：

```go
http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
})
```

### Volume 数据丢失

- Volume 是区域绑定的
- 机器只能访问同区域的 volume
- 使用 SQLite 等需要 volume 持久化

### 冷启动慢

```toml
[http_service]
  min_machines_running = 1  # 保持至少 1 台运行
```

### 查看构建日志

```bash
fly deploy --verbose
```

## 费用控制

```toml
[http_service]
  auto_stop_machines = 'stop'   # 无流量自动停止
  min_machines_running = 0      # 可以停止所有机器 (有冷启动)
```

免费额度：
- 3 个 shared-cpu-1x 虚拟机
- 3GB 持久存储
- 160GB 出站流量
