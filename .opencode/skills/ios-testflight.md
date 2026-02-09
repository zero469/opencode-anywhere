# iOS TestFlight 发布

构建、签名、上传 iOS App 到 TestFlight。

## 前置条件

- Xcode 15+ 已安装
- Apple Developer 账号已登录 Xcode
- App 已在 App Store Connect 创建
- 证书和 Provisioning Profile 已配置

## 发布流程

### 1. 构建 Web 资源并同步到 iOS

```bash
cd /path/to/project
npm run build:native
```

这会执行：
- `next build` - 构建 Next.js 静态资源
- `next export` (如果需要) - 导出静态文件
- `npx cap sync ios` - 同步到 iOS 项目

### 2. 打开 Xcode

```bash
npx cap open ios
```

### 3. 更新版本号

在 Xcode 中：
1. 选择项目 → Target → General
2. 更新 **Version** (如 1.0.0) - 用户可见版本
3. 更新 **Build** (递增数字，如 8) - 每次上传必须递增

或者命令行：
```bash
# 查看当前版本
cd ios/App
xcodebuild -showBuildSettings | grep -E "MARKETING_VERSION|CURRENT_PROJECT_VERSION"

# 修改 (在 project.pbxproj 中)
```

### 4. Archive 构建

1. Xcode 菜单: **Product → Archive**
2. 等待构建完成（几分钟）
3. Archive 成功后会自动打开 Organizer 窗口

### 5. 上传到 App Store Connect

1. 在 Organizer 中选择刚创建的 Archive
2. 点击 **Distribute App**
3. 选择 **App Store Connect** → **Upload**
4. 保持默认选项，一路 Next
5. 等待上传完成

### 6. 在 App Store Connect 处理

1. 打开 [App Store Connect](https://appstoreconnect.apple.com)
2. 选择你的 App → **TestFlight**
3. 等待 Apple 处理（通常 5-30 分钟）
4. 处理完成后，构建会出现在 TestFlight 中
5. 如果需要，填写 **Export Compliance** 信息
6. 将构建添加到测试组

### 7. 获取 TestFlight 公开链接

1. TestFlight → External Testing
2. 创建或选择一个 Group
3. 启用 **Public Link**
4. 复制链接（格式: `https://testflight.apple.com/join/XXXXXX`）

## 常见问题

### Archive 失败 - Signing 问题

```
Signing for "App" requires a development team
```

解决：
1. Xcode → 项目 → Signing & Capabilities
2. 选择你的 Team
3. 确保 Bundle Identifier 唯一

### 上传失败 - 版本号冲突

```
ERROR: A build with this build number already exists
```

解决：递增 Build 号（必须比之前的大）

### 处理时间过长

Apple 处理通常 5-30 分钟，如果超过 1 小时：
1. 检查 App Store Connect 邮件通知
2. 可能有合规性问题需要处理

## 自动化 (可选)

使用 Fastlane 实现 CI/CD:

```ruby
# Fastfile
lane :beta do
  build_app(scheme: "App")
  upload_to_testflight
end
```

```bash
fastlane beta
```
