# English Tutor Assistant (AURAE VOICE) - 项目规范

本项目是一个基于 Next.js 的英语口语陪练应用，目标是通过大模型能力为用户提供高质量的口语练习、反馈和学习路径体验。

## 核心技术栈

- **框架**: Next.js 16+ (App Router)
- **样式**: Tailwind CSS + shadcn/ui
- **语言**: TypeScript
- **状态管理**: Zustand
- **图标**: Lucide React
- **AI 接口**: Kimi / Moonshot API，通过 Next.js Route Handlers 调用

## 开发原则

1. **组件化**: 优先编写可复用的 UI 组件，保持 `components/` 目录整洁。
2. **类型安全**: 避免使用 `any`，所有 API 响应和组件 Props 尽量定义清晰类型。
3. **响应式设计**: 必须适配移动端，因为口语练习常在手机上进行。
4. **流式响应**: AI 对话必须支持流式输出，降低首包延迟。
5. **错误处理**: 妥善处理网络请求失败、麦克风权限被拒绝、额度耗尽等异常情况。
6. **输出安全**: 不要把工具调用协议、JSON payload、调试日志或乱码内容直接暴露给用户。

## 目录结构约定

- `app/api/`: 后端接口和 Route Handlers
- `components/`: UI 组件
- `hooks/`: 自定义 React Hooks，例如语音输入和语音播放逻辑
- `lib/`: 工具函数、服务端配置、AI 工具和内容数据
- `store/`: Zustand 状态仓库
- `types/`: 全局 TypeScript 类型定义

## 特殊指令

- 修改 Next.js 代码前，先参考 `node_modules/next/dist/docs/` 中当前版本的本地文档。
- API 密钥必须通过 `.env.local` 管理，严禁硬编码或提交到 Git。
- 语音交互逻辑应封装在独立 Hook 中，避免和 UI 组件强耦合。
- 面向用户的中文内容必须保持 UTF-8 正常显示；发现 mojibake 或 BOM 污染时应及时清理。
