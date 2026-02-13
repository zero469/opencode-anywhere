---
name: azure-webapp-deploy
description: Deploy Go services to Azure Web App using Docker containers
---

# Azure Web App 部署

Go 服务部署到 Azure Web App (Container) 的完整流程。

## 前置条件

```bash
# 安装 Azure CLI
brew install azure-cli

# 登录
az login
```

## 架构选择

Azure Web App 支持多种部署方式：

| 方式 | 适用场景 |
|------|----------|
| **Container (Docker)** | Go/Rust 等需要自定义运行时 ✅ 推荐 |
| Code (内置运行时) | Node.js/Python/.NET 等官方支持的运行时 |
| Static Web App | 纯前端静态站点 |

Go 应用推荐使用 **Container** 方式。

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

## 方式一：GitHub Actions 自动部署 (推荐)

### 1. 创建 Azure 资源

```bash
# 创建资源组
az group create --name myResourceGroup --location eastasia

# 创建 App Service Plan (Linux)
az appservice plan create \
  --name myPlan \
  --resource-group myResourceGroup \
  --is-linux \
  --sku B1

# 创建 Web App (Container)
az webapp create \
  --name my-app-name \
  --resource-group myResourceGroup \
  --plan myPlan \
  --deployment-container-image-name nginx  # 临时镜像
```

### 2. 配置 GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure

on:
  workflow_dispatch:  # 手动触发
  # 或自动触发:
  # push:
  #   branches: [main]

env:
  AZURE_WEBAPP_NAME: my-app-name
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.24'

      - name: Run tests
        run: go test ./...

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

### 3. 配置 Secrets

#### 获取 Publish Profile

```bash
az webapp deployment list-publishing-profiles \
  --name my-app-name \
  --resource-group myResourceGroup \
  --xml
```

复制输出的 XML，添加到 GitHub Secrets：`AZURE_WEBAPP_PUBLISH_PROFILE`

#### 或使用 Service Principal (更安全)

```bash
# 创建 Service Principal
az ad sp create-for-rbac \
  --name "github-actions" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
  --sdk-auth
```

输出的 JSON 添加到 GitHub Secrets：`AZURE_CREDENTIALS`

然后在 workflow 中：

```yaml
- uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}

- name: Deploy to Azure Web App
  uses: azure/webapps-deploy@v3
  with:
    app-name: ${{ env.AZURE_WEBAPP_NAME }}
    images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

### 4. 手动触发部署

GitHub 仓库 → Actions → Deploy to Azure → Run workflow

## 方式二：Azure CLI 手动部署

### 构建并推送镜像

```bash
# 登录 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 构建
docker build -t ghcr.io/username/repo:latest .

# 推送
docker push ghcr.io/username/repo:latest
```

### 部署到 Web App

```bash
# 配置容器镜像
az webapp config container set \
  --name my-app-name \
  --resource-group myResourceGroup \
  --docker-custom-image-name ghcr.io/username/repo:latest \
  --docker-registry-server-url https://ghcr.io \
  --docker-registry-server-user USERNAME \
  --docker-registry-server-password GITHUB_TOKEN

# 重启应用
az webapp restart --name my-app-name --resource-group myResourceGroup
```

## 环境变量配置

### 通过 Azure Portal

App Service → Configuration → Application settings → New application setting

### 通过 CLI

```bash
# 设置单个
az webapp config appsettings set \
  --name my-app-name \
  --resource-group myResourceGroup \
  --settings KEY=value

# 设置多个
az webapp config appsettings set \
  --name my-app-name \
  --resource-group myResourceGroup \
  --settings \
    DATABASE_URL="postgres://..." \
    JWT_SECRET="xxx" \
    PORT="8080"
```

### 必要的环境变量

```bash
# Azure Web App 默认监听的端口
WEBSITES_PORT=8080

# 或让应用读取 PORT 环境变量
PORT=8080
```

## 持久化存储

Azure Web App Container 默认无持久存储。需要挂载 Azure Storage：

```bash
# 创建 Storage Account
az storage account create \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --location eastasia \
  --sku Standard_LRS

# 创建 File Share
az storage share create \
  --name myshare \
  --account-name mystorageaccount

# 挂载到 Web App
az webapp config storage-account add \
  --name my-app-name \
  --resource-group myResourceGroup \
  --custom-id myfiles \
  --storage-type AzureFiles \
  --share-name myshare \
  --account-name mystorageaccount \
  --access-key <storage-access-key> \
  --mount-path /app/data
```

## 自定义域名

### 1. 添加域名

```bash
az webapp config hostname add \
  --webapp-name my-app-name \
  --resource-group myResourceGroup \
  --hostname www.example.com
```

### 2. 配置 DNS

添加 CNAME 记录：`www` → `my-app-name.azurewebsites.net`

### 3. 绑定 SSL 证书

```bash
# 使用 App Service 托管证书 (免费)
az webapp config ssl create \
  --name my-app-name \
  --resource-group myResourceGroup \
  --hostname www.example.com

# 绑定
az webapp config ssl bind \
  --name my-app-name \
  --resource-group myResourceGroup \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

## 日志查看

### 实时日志

```bash
az webapp log tail \
  --name my-app-name \
  --resource-group myResourceGroup
```

### 启用日志

```bash
az webapp log config \
  --name my-app-name \
  --resource-group myResourceGroup \
  --docker-container-logging filesystem
```

### 下载日志

```bash
az webapp log download \
  --name my-app-name \
  --resource-group myResourceGroup \
  --log-file logs.zip
```

## 扩缩容

### 手动扩容

```bash
# 垂直扩展 (更大的实例)
az appservice plan update \
  --name myPlan \
  --resource-group myResourceGroup \
  --sku P1V2

# 水平扩展 (更多实例)
az webapp scale \
  --name my-app-name \
  --resource-group myResourceGroup \
  --instance-count 3
```

### 自动扩缩

在 Azure Portal 中配置 Autoscale 规则，或使用 CLI：

```bash
az monitor autoscale create \
  --resource-group myResourceGroup \
  --resource my-app-name \
  --resource-type Microsoft.Web/sites \
  --name autoscale-rule \
  --min-count 1 \
  --max-count 5 \
  --count 1
```

## 常见问题

### 容器启动失败

```bash
# 查看容器日志
az webapp log tail --name my-app-name --resource-group myResourceGroup

# 检查端口配置
az webapp config appsettings list --name my-app-name --resource-group myResourceGroup
```

确保应用监听 `WEBSITES_PORT` 或 `PORT` 环境变量指定的端口。

### 冷启动慢

```bash
# 启用 Always On (需要 Basic 或更高级别)
az webapp config set \
  --name my-app-name \
  --resource-group myResourceGroup \
  --always-on true
```

### 健康检查失败

配置健康检查端点：

```bash
az webapp config set \
  --name my-app-name \
  --resource-group myResourceGroup \
  --generic-configurations '{"healthCheckPath": "/health"}'
```

## 费用参考

| SKU | vCPU | 内存 | 价格/月 (估算) |
|-----|------|------|---------------|
| F1 (Free) | 共享 | 1GB | 免费 (有限制) |
| B1 (Basic) | 1 | 1.75GB | ~$13 |
| P1V2 (Premium) | 1 | 3.5GB | ~$81 |

免费层限制：每天 60 分钟 CPU 时间，无自定义域名 SSL。
