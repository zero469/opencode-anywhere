---
name: capacitor-ios
description: Next.js + Capacitor hybrid iOS app development workflow
---

# Capacitor iOS 开发

Next.js + Capacitor 混合应用开发完整流程。

## 项目结构

```
project/
├── src/                    # Next.js 源码
├── public/                 # 静态资源
├── ios/                    # Capacitor iOS 项目
│   └── App/
│       ├── App/            # iOS 源码
│       │   ├── Assets.xcassets/  # App Icon 等资源
│       │   └── Info.plist        # iOS 配置
│       └── App.xcodeproj   # Xcode 项目
├── capacitor.config.ts     # Capacitor 配置
└── package.json
```

## 初始化 Capacitor

```bash
# 安装 Capacitor
npm install @capacitor/core @capacitor/ios

# 初始化 (如果是新项目)
npx cap init

# 添加 iOS 平台
npx cap add ios
```

## 日常开发流程

### 1. Web 开发 (快速迭代)

```bash
# 启动开发服务器
npm run dev

# 浏览器打开 http://localhost:3000
```

### 2. iOS 预览

```bash
# 构建并同步
npm run build:native

# 打开 Xcode
npx cap open ios

# 或者使用 Live Reload (开发时)
npx cap run ios --livereload --external
```

### 3. 同步更改到 iOS

每次修改 web 代码后：

```bash
# 完整构建
npm run build:native

# 或只同步 (如果只改了配置)
npx cap sync ios
```

## Capacitor 配置

`capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.yourapp',
  appName: 'Your App',
  webDir: 'out',  // Next.js 静态导出目录
  server: {
    // 开发时可指向本地服务器
    // url: 'http://192.168.1.100:3000',
    // cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'App',
  },
};

export default config;
```

## Next.js 配置

`next.config.js` (用于静态导出):

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,  // 静态导出不支持图片优化
  },
  // 如果用了 basePath
  // basePath: '/app',
};

module.exports = nextConfig;
```

## 原生功能集成

### 使用 Capacitor 插件

```bash
# 安装插件
npm install @capacitor/camera @capacitor/haptics @capacitor/keyboard
npx cap sync
```

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// 拍照
const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri,
  });
  return image.webPath;
};

// 震动反馈
const hapticFeedback = async () => {
  await Haptics.impact({ style: ImpactStyle.Medium });
};
```

### 检测运行环境

```typescript
import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();
const isIOS = () => Capacitor.getPlatform() === 'ios';
const isWeb = () => Capacitor.getPlatform() === 'web';
```

## App Icon 设置

1. 准备 1024x1024 PNG 图片（无透明通道）
2. 放到 `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
3. 命名为 `AppIcon-512@2x.png`
4. 更新 `Contents.json`:

```json
{
  "images": [
    {
      "filename": "AppIcon-512@2x.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": { "version": 1, "author": "xcode" }
}
```

## 调试

### Safari Web Inspector

1. iPhone 设置 → Safari → 高级 → Web Inspector 开启
2. Mac Safari → 开发菜单 → 选择你的设备
3. 可以看到 console.log、网络请求等

### Xcode Console

1. 在 Xcode 中运行 App
2. View → Debug Area → Activate Console
3. 查看原生日志

### 常用调试命令

```bash
# 查看已连接设备
xcrun xctrace list devices

# 清理构建缓存
cd ios/App && xcodebuild clean

# 重置 iOS 模拟器
xcrun simctl erase all
```

## 常见问题

### Build 失败 - CocoaPods

```bash
cd ios/App
pod install --repo-update
```

### 白屏 - webDir 路径错误

确保 `capacitor.config.ts` 中 `webDir` 指向正确的构建输出目录。

### 网络请求失败 - ATS

在 `Info.plist` 添加 (仅开发):

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

### Safe Area 问题

```css
/* 适配刘海屏 */
.container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```
