# 🥗 AI 食物热量识别与个性化饮食助手

拍照即知食物热量与营养，AI 结合你的健康档案给出个性化饮食建议。

## 项目结构

```
AI-Food-App/
├── app/                        # Expo Router 页面
│   ├── _layout.tsx             # 根布局
│   ├── index.tsx               # 启动页（档案检查）
│   ├── profile-setup.tsx       # 首次档案设置
│   └── (tabs)/
│       ├── _layout.tsx         # 底部 Tab 导航（历史|拍照|我的）
│       ├── history.tsx         # 历史记录 + 今日汇总
│       ├── capture.tsx         # 拍照识别（相机 + 结果展示）
│       └── profile.tsx         # 个人档案编辑
├── components/
│   ├── CameraModal.tsx         # 相机/相册模态框
│   ├── FoodCard.tsx            # 食物分析结果卡片
│   └── ProgressCircle.tsx      # 环形进度指示器
├── utils/
│   ├── api.ts                  # 后端 API 封装
│   └── storage.ts              # AsyncStorage 操作
├── types/
│   └── index.ts                # TypeScript 类型定义
├── server/                     # Express 后端
│   ├── src/
│   │   ├── index.ts            # Express 服务入口
│   │   └── foodAnalysis.ts     # DeepSeek API + 联网搜索逻辑
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── assets/                     # 图标和启动画面（需自行添加）
├── app.json                    # Expo 配置（含权限）
├── package.json                # 前端依赖
└── .env.example                # 前端环境变量示例
```

## 快速启动

### 1. 启动后端服务

```bash
cd server
npm install
cp .env.example .env
# 编辑 .env，填入你的 DEEPSEEK_API_KEY（在 https://platform.deepseek.com 获取）
npm run dev
```

后端运行在 `http://localhost:3001`。

### 2. 启动 Expo App

```bash
# 在项目根目录
npm install
cp .env.example .env
# 如果用真机调试，编辑 .env 中的 EXPO_PUBLIC_API_URL 为你的局域网 IP
npx expo start
```

用 Expo Go 扫码即可运行。

### 3. 配置 API 地址

| 运行环境 | API 地址 |
|---------|---------|
| iOS 模拟器 | `http://localhost:3001` |
| Android 模拟器 | `http://10.0.2.2:3001` |
| 真机 (局域网) | `http://192.168.x.x:3001` |

修改 `.env` 中的 `EXPO_PUBLIC_API_URL`。

## 所需依赖

### 前端 (Expo)
- expo, expo-router, expo-camera, expo-image-picker
- expo-image-manipulator, expo-file-system
- @react-native-async-storage/async-storage
- react-native-svg, @expo/vector-icons
- react-native-safe-area-context, react-native-screens
- react-native-gesture-handler, react-native-reanimated

### 后端 (Express)
- express, cors, dotenv
- openai (指向 DeepSeek API)
- tsx, typescript

## App 图标

推荐使用清新简约的食物/营养主题图标。可从以下免费资源获取：
- https://www.flaticon.com/ （搜索 "food nutrition" 或 "healthy eating"）
- 将图标放到 `assets/icon.png`（1024x1024px）
- 将启动画面放到 `assets/splash.png`

## 功能说明

| 功能 | 描述 |
|------|------|
| 健康档案 | 首次启动强制填写，含身高体重目标等 |
| 拍照识别 | 拍照或选图，自动压缩后发 AI 分析 |
| AI 分析 | DeepSeek Vision 识别食物、估算热量及三大宏量素 |
| 联网搜索 | 自动搜索 DuckDuckGo 获取食物营养参考数据，提升准确性 |
| 饮食检查 | 自动检查是否违反用户饮食限制 |
| 今日汇总 | 环形进度条展示当日热量达成率 |
| 历史记录 | 按时间倒序展示所有饮食记录 |

## 技术要点

- **图片压缩**: 前端使用 expo-image-manipulator 限制最大宽度 1024px
- **AI 引擎**: DeepSeek Vision API（兼容 OpenAI SDK 格式）
- **联网搜索**: DuckDuckGo 免费 API 实时查询营养数据，全部在用户终端执行
- **数据安全**: 所有计算在本地完成，不经过第三方
- **AI Prompt**: 后端构造严格 JSON schema，结合联网数据做精确分析
- **热量估算**: Mifflin-St Jeor 公式 + 目标调整
- **本地存储**: AsyncStorage 持久化档案和历史记录
- **导航**: expo-router 文件系统路由 + 自定义中间拍照按钮

## 联网搜索架构

```
用户拍照
    │
    ▼
DeepSeek 识别食物名称 (Step 1)
    │
    ▼
本地联网搜索营养数据 (Step 2)  ← 在用户终端执行
├── DuckDuckGo Instant Answer API (免费, 无需注册)
└── 自动降级: DuckDuckGo HTML 抓取
    │
    ▼
DeepSeek 结合联网数据精确分析 (Step 3)
    │
    ▼
后端本地计算: 汇总 + 占比 + 个性化建议 (Step 4)
    │
    ▼
返回前端展示
```

全程数据不离开用户终端，联网搜索仅用于获取公开的营养参考数据。
