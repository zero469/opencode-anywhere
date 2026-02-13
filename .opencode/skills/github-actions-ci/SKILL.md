---
name: github-actions-ci
description: GitHub Actions CI/CD automation for testing, building, and releasing
---

# GitHub Actions CI

自动化测试、构建、发布流程配置。

## 基础 CI 配置

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
```

## 触发条件

```yaml
on:
  # PR 触发
  pull_request:
    branches: [main]
  
  # Push 触发
  push:
    branches: [main]
  
  # Tag 触发 (发布)
  push:
    tags:
      - 'v*'
  
  # 手动触发
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
  
  # 定时触发
  schedule:
    - cron: '0 0 * * *'  # 每天 UTC 0:00
```

## 常用 Actions

### Node.js 项目

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # 或 'yarn', 'pnpm'

- run: npm ci
- run: npm test
- run: npm run build
```

### Go 项目

```yaml
- uses: actions/setup-go@v5
  with:
    go-version: '1.22'
    cache: true

- run: go mod download
- run: go test ./...
- run: go build -o bin/app ./cmd/app
```

### Docker 构建

```yaml
- uses: docker/setup-buildx-action@v3

- uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKER_USERNAME }}
    password: ${{ secrets.DOCKER_PASSWORD }}

- uses: docker/build-push-action@v5
  with:
    push: true
    tags: user/app:${{ github.sha }}
```

## Secrets 和环境变量

### 设置 Secrets

1. GitHub 仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 添加 Name 和 Value

### 使用 Secrets

```yaml
env:
  API_KEY: ${{ secrets.API_KEY }}

steps:
  - run: echo "Key is $API_KEY"
    env:
      API_KEY: ${{ secrets.API_KEY }}
```

### 内置变量

```yaml
${{ github.sha }}           # Commit SHA
${{ github.ref }}           # refs/heads/main 或 refs/tags/v1.0.0
${{ github.ref_name }}      # main 或 v1.0.0
${{ github.repository }}    # owner/repo
${{ github.event_name }}    # push, pull_request, etc.
${{ github.actor }}         # 触发者用户名
```

## 发布 Release

### 自动创建 Release

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: |
          npm ci
          npm run build

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            dist/*.zip
            dist/*.tar.gz
          generate_release_notes: true
```

### Go 多平台构建发布

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        goos: [linux, darwin, windows]
        goarch: [amd64, arm64]
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Build
        env:
          GOOS: ${{ matrix.goos }}
          GOARCH: ${{ matrix.goarch }}
        run: |
          go build -o bin/app-${{ matrix.goos }}-${{ matrix.goarch }} ./cmd/app

      - name: Upload Release Assets
        uses: softprops/action-gh-release@v1
        with:
          files: bin/*
```

## 部署

### 部署到 fly.io

```yaml
- uses: superfly/flyctl-actions/setup-flyctl@master

- run: flyctl deploy --remote-only
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### 部署到 Vercel

```yaml
- uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    vercel-args: '--prod'
```

## 缓存

### npm 缓存

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

### 自定义缓存

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.cache/go-build
      ~/go/pkg/mod
    key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
    restore-keys: |
      ${{ runner.os }}-go-
```

## 矩阵构建

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22]
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
```

## 条件执行

```yaml
steps:
  # 只在 main 分支执行
  - run: npm run deploy
    if: github.ref == 'refs/heads/main'

  # 只在 tag 时执行
  - run: npm run release
    if: startsWith(github.ref, 'refs/tags/')

  # 只在 PR 时执行
  - run: npm run preview
    if: github.event_name == 'pull_request'

  # 前一步失败时执行
  - run: npm run cleanup
    if: failure()
```

## 调试

### 查看失败日志

```bash
# 列出最近运行
gh run list --limit 5

# 查看失败日志
gh run view <run-id> --log-failed
```

### 本地调试 (act)

```bash
# 安装 act
brew install act

# 运行 workflow
act push
```
